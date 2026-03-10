/**
 * components/Map/MapView.tsx
 *
 * The core map component. Renders the MapLibre map, handles user interaction
 * (hover tooltips, click → select CBD or drill into city), and orchestrates
 * child components.
 *
 * TWO-LEVEL INTERACTION MODEL:
 * The map shows two zoom levels of data:
 *   LOW ZOOM  (< CITY_ZOOM_THRESHOLD): one circle per city, averaged metrics.
 *             Clicking a city circle flies the camera in past the threshold.
 *   HIGH ZOOM (>= CITY_ZOOM_THRESHOLD): individual CBD circles.
 *             Clicking a CBD opens the side panel and pulses that circle.
 *
 * REGION NAVIGATION:
 * At global zoom a "Zoom to region" panel appears top-right. Each button flies
 * the camera to that region. When zoomed in, the panel is replaced by a
 * "Return to global view" button.
 *
 * WHY 'use client'?
 * MapLibre GL uses WebGL — a browser-only graphics API. It cannot run during
 * server-side rendering (SSR). The 'use client' directive tells Next.js: "this
 * component and everything it imports runs only in the browser."
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Map, { type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'maplibre-gl';

import { useMapContext } from '../../lib/MapContext';
import { getMetricConfig } from '../../lib/metricConfig';
import { formatMetricValue } from '../../lib/formatters';
import {
  MAP_STYLE_URL, LAYER_IDS, MAP_INITIAL_VIEW,
  FLY_TO_ZOOM, FLY_TO_DURATION, FLY_TO_CURVE,
  PULSE_START_RADIUS, PULSE_EXPAND_BY, PULSE_PEAK_OPACITY, PULSE_CYCLE_MS,
} from '../../lib/mapConfig';
import { STRINGS } from '../../constants/strings';
import type { CBDProperties, CityAggProperties } from '../../types/cbd';

import { CircleLayer } from './CircleLayer';
import { RegionButtons } from './RegionButtons';
import { MetricSwitcher } from './MetricSwitcher';
import { MapLegend } from './MapLegend';
import { HoverTooltip } from '../Tooltip/HoverTooltip';
import styles from './MapView.module.css';

/** Position of the mouse cursor in container-relative pixels */
interface TooltipPosition {
  x: number;
  y: number;
}

/**
 * Unified hover state — covers city-level and CBD-level circles.
 * Only one can be hovered at a time (MapLibre layers don't overlap at the
 * same zoom level), but we track them separately for type safety.
 */
interface HoverState {
  /** Set when hovering an individual CBD circle */
  cbd: CBDProperties | null;
  /** Set when hovering a city aggregate circle */
  city: CityAggProperties | null;
  pos: TooltipPosition;
}

const EMPTY_HOVER: HoverState = { cbd: null, city: null, pos: { x: 0, y: 0 } };

/** Shared easing curve for all flyTo calls — cubic ease-in-out */
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function MapView() {
  const mapRef = useRef<MapRef>(null);

  const { geojsonData, cityData, activeMetric, selectedCBD, setSelectedCBD, flyToGlobalRef, resetToGlobal } = useMapContext();

  const [hover, setHover] = useState<HoverState>(EMPTY_HOVER);

  /**
   * Track the map's current zoom level so we can:
   *  1. Show/hide continent label markers (visible below CONTINENT_ZOOM_MAX)
   *  2. Show/hide the "Return to global view" button (visible above initial zoom)
   *
   * We update this on onZoomEnd rather than onZoom so state only changes
   * once per zoom gesture/animation — not on every intermediate frame.
   */
  const [mapZoom, setMapZoom] = useState(MAP_INITIAL_VIEW.zoom);

  const handleZoomEnd = useCallback((e: ViewStateChangeEvent) => {
    setMapZoom(e.viewState.zoom);
  }, []);

  // ---------------------------------------------------------------------------
  // Pulse animation — runs whenever selectedCBD changes
  // ---------------------------------------------------------------------------

  /**
   * requestAnimationFrame loop that drives the pulse ring on the selected CBD.
   * We call setPaintProperty directly on the MapLibre instance (not React state)
   * so the animation runs at 60fps without causing React re-renders.
   */
  const pulseFrameRef = useRef<number>(0);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !selectedCBD) {
      cancelAnimationFrame(pulseFrameRef.current);
      try {
        mapRef.current?.getMap()?.setPaintProperty(
          LAYER_IDS.selectedPulse, 'circle-stroke-opacity', 0,
        );
      } catch { /* layer not yet added to map */ }
      return;
    }

    let startTime: number | null = null;

    function frame(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const t = ((timestamp - startTime) % PULSE_CYCLE_MS) / PULSE_CYCLE_MS;
      const eased = 1 - (1 - t) * (1 - t);
      const radius = PULSE_START_RADIUS + eased * PULSE_EXPAND_BY;
      const opacity = PULSE_PEAK_OPACITY * (1 - t);

      try {
        const m = mapRef.current?.getMap();
        if (!m) return;
        m.setPaintProperty(LAYER_IDS.selectedPulse, 'circle-radius', radius);
        m.setPaintProperty(LAYER_IDS.selectedPulse, 'circle-stroke-opacity', opacity);
      } catch { /* layer briefly unavailable during style reload */ }

      pulseFrameRef.current = requestAnimationFrame(frame);
    }

    pulseFrameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(pulseFrameRef.current);
  }, [selectedCBD]);

  // ---------------------------------------------------------------------------
  // Click handler
  // ---------------------------------------------------------------------------

  /**
   * Two behaviours depending on which layer was clicked:
   *
   * CITY CIRCLE (low zoom): fly to CITY_FLY_TO_ZOOM so individual CBDs appear.
   *   Once the animation ends, automatically select the CBD in that city with
   *   the highest Stickiness Score so the side panel opens without an extra click.
   *   We use map.once('moveend', ...) — MapLibre fires this event exactly once
   *   when the camera stops moving, which is the right moment to show the panel.
   *
   * CBD CIRCLE (high zoom): select that CBD (opens side panel) and fly to it
   *   at the full FLY_TO_ZOOM so the neighbourhood is visible.
   *
   * We distinguish the two by checking feature.layer.id against our constants.
   */
  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) {
        setSelectedCBD(null);
        return;
      }

      const layerId = feature.layer.id;

      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;

      if (layerId === LAYER_IDS.cityCircleHitArea) {
        const cityName = (feature.properties as CityAggProperties).city;

        // Find the CBD with the highest Stickiness Score in this city
        const cityFeatures = geojsonData.features.filter(
          (f) => f.properties.city === cityName,
        );
        const bestCBD = cityFeatures.reduce((best, f) =>
          f.properties.stickinessScore > best.properties.stickinessScore ? f : best,
        );

        const [bestLng, bestLat] = bestCBD.geometry.coordinates;

        setSelectedCBD(null); // clear any previous selection while flying
        /**
         * Fly directly to the winning CBD's actual coordinates at the same
         * zoom as a regular CBD click. This eliminates two sources of glitch:
         *   1. Flying to the city centroid (averaged position) then jumping
         *      to the CBD position when the side panel opens.
         *   2. Stopping at an intermediate zoom and doing a second animation.
         * With curve: 1.0, MapLibre glides smoothly — the zoom threshold
         * (zoom 7) is crossed mid-flight so city circles fade naturally into
         * individual CBD circles without any abrupt switch.
         */
        mapRef.current?.flyTo({
          center: [bestLng, bestLat],
          zoom: FLY_TO_ZOOM,
          duration: FLY_TO_DURATION,
          curve: FLY_TO_CURVE,
          easing: easeInOut,
        });

        // Once the camera stops, select the best CBD — the side panel slides in
        mapRef.current?.getMap()?.once('moveend', () => {
          setSelectedCBD(bestCBD.properties);
        });
      } else {
        // Individual CBD clicked — select it and zoom to neighbourhood level
        const props = feature.properties as CBDProperties;
        setSelectedCBD(props);
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: FLY_TO_ZOOM,
          duration: FLY_TO_DURATION,
          curve: FLY_TO_CURVE,
          easing: easeInOut,
        });
      }
    },
    [setSelectedCBD, geojsonData],
  );

  // ---------------------------------------------------------------------------
  // Mouse move handler — show tooltip
  // ---------------------------------------------------------------------------

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) {
      setHover(EMPTY_HOVER);
      return;
    }

    const pos = { x: e.point.x, y: e.point.y };
    if (feature.layer.id === LAYER_IDS.cityCircleHitArea) {
      setHover({ cbd: null, city: feature.properties as CityAggProperties, pos });
    } else {
      setHover({ cbd: feature.properties as CBDProperties, city: null, pos });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHover(EMPTY_HOVER);
  }, []);

  // ---------------------------------------------------------------------------
  // Reset handler — return to global view
  // ---------------------------------------------------------------------------

  /**
   * Register the flyTo function in context so SidePanel (and any other
   * component) can trigger a camera reset without holding a map reference.
   * We do this in a useEffect with an empty dependency array so it runs once
   * after mount — mapRef.current is guaranteed to be set by then.
   */
  useEffect(() => {
    flyToGlobalRef.current = () => {
      mapRef.current?.flyTo({
        center: [MAP_INITIAL_VIEW.longitude, MAP_INITIAL_VIEW.latitude],
        zoom: MAP_INITIAL_VIEW.zoom,
        duration: FLY_TO_DURATION,
        curve: FLY_TO_CURVE,
        easing: easeInOut,
      });
    };
  // flyToGlobalRef is a stable ref object — its identity never changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToGlobalRef]);

  // ---------------------------------------------------------------------------
  // Region button handler
  // ---------------------------------------------------------------------------

  const handleRegionClick = useCallback(
    (center: [number, number], flyToZoom: number) => {
      mapRef.current?.flyTo({
        center,
        zoom: flyToZoom,
        duration: FLY_TO_DURATION,
        curve: FLY_TO_CURVE,
        easing: easeInOut,
      });
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Tooltip data — computed from whichever feature is currently hovered
  // ---------------------------------------------------------------------------

  const activeMetricConfig = getMetricConfig(activeMetric);
  const isHovering = hover.cbd !== null || hover.city !== null;

  const tooltipDistrict = hover.cbd?.district ?? hover.city?.city ?? '';
  const tooltipCity = hover.cbd
    ? hover.cbd.city
    : hover.city
      ? `${hover.city.cbdCount} district${hover.city.cbdCount === 1 ? '' : 's'}`
      : '';
  const tooltipMetricValue = hover.cbd
    ? formatMetricValue(hover.cbd[activeMetric], activeMetricConfig.unit)
    : hover.city
      ? formatMetricValue(hover.city[activeMetric], activeMetricConfig.unit)
      : '';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  /**
   * The top-right corner shows one of two things depending on zoom:
   *   - At global zoom: "Zoom to region" buttons to help orient the user
   *   - Zoomed in: "Return to global view" button
   * The threshold (initial zoom + 0.7) keeps them mutually exclusive.
   */
  const showGlobalViewButton = mapZoom > MAP_INITIAL_VIEW.zoom + 0.7;
  const showRegionButtons = !showGlobalViewButton;

  return (
    <div className={styles.container}>
      <Map
        ref={mapRef}
        initialViewState={MAP_INITIAL_VIEW}
        mapStyle={MAP_STYLE_URL}
        style={{ width: '100%', height: '100%' }}
        /**
         * Both hit-area layers are listed so events fire at the correct zoom.
         * MapLibre won't generate events for layers hidden by minzoom/maxzoom,
         * so whichever is visible at the current zoom will receive the event.
         */
        interactiveLayerIds={[LAYER_IDS.cityCircleHitArea, LAYER_IDS.circleHitArea]}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        /**
         * onZoomEnd fires once when a zoom gesture or animation completes —
         * cheaper than onZoom which fires on every intermediate frame.
         */
        onZoomEnd={handleZoomEnd}
        cursor={isHovering ? 'pointer' : 'grab'}
        // scrollZoom={false} 
        // dragPan={false}
      >

        <CircleLayer
          data={geojsonData}
          cityData={cityData}
          activeMetric={activeMetric}
          selectedCBDId={selectedCBD?.id ?? null}
          hoveredCityId={hover.city?.id ?? null}
        />
      </Map>

      {/* MetricSwitcher floats over the map in the top-left corner */}
      <div className={styles.controls}>
        <MetricSwitcher />
      </div>

      {/* Top-right nav — region buttons at global zoom, return button when zoomed in */}
      <div className={styles.topRight}>
        {showRegionButtons && (
          <RegionButtons onRegionClick={handleRegionClick} />
        )}
        {showGlobalViewButton && (
          <button
            className={styles.globalViewButton}
            onClick={resetToGlobal}
            aria-label={STRINGS.map.globalViewAriaLabel}
          >
            {STRINGS.map.globalViewButton}
          </button>
        )}
      </div>

      {/* Legend floats over the map in the bottom-left corner */}
      <div className={styles.legend}>
        <MapLegend />
      </div>

      {isHovering && (
        <HoverTooltip
          district={tooltipDistrict}
          city={tooltipCity}
          metricLabel={activeMetricConfig.label}
          metricValue={tooltipMetricValue}
          x={hover.pos.x}
          y={hover.pos.y}
        />
      )}
    </div>
  );
}
