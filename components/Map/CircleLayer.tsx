/**
 * components/Map/CircleLayer.tsx
 *
 * Renders CBD data as circle markers inside the MapLibre map.
 *
 * TWO-LEVEL ZOOM BEHAVIOUR:
 * At low zoom (< CITY_ZOOM_THRESHOLD) we show one circle per city, sized and
 * coloured by the average of all CBDs in that city. At high zoom we switch to
 * individual CBD circles. MapLibre handles the switch automatically via the
 * `minzoom` / `maxzoom` props on each <Layer> — no JavaScript zoom tracking
 * is needed here.
 *
 * HOW THIS WORKS WITH MAPLIBRE:
 * MapLibre uses a "source → layer" model:
 *   - A SOURCE is the raw data (our GeoJSON FeatureCollection).
 *   - A LAYER defines how to render that data (circles, in our case).
 *
 * react-map-gl provides <Source> and <Layer> React components that manage
 * these declaratively. When we change the `paint` prop on <Layer>,
 * react-map-gl calls map.setPaintProperty() under the hood, which MapLibre
 * animates smoothly via its built-in transition system.
 *
 * HIT AREA LAYERS:
 * Each zoom level has a transparent hit-area layer with a larger radius than
 * the visible circles. On mobile, small circles are hard to tap. Both hit-area
 * layers are registered in MapView's interactiveLayerIds so click/hover events
 * fire reliably at either zoom level.
 */

import { Source, Layer } from 'react-map-gl/maplibre';
import type { CircleLayerSpecification, ExpressionSpecification } from 'maplibre-gl';
import type { CBDFeatureCollection, CityAggFeatureCollection } from '../../types/cbd';
import type { MetricKey } from '../../types/cbd';
import { getMetricConfig } from '../../lib/metricConfig';
import {
  SOURCE_IDS,
  LAYER_IDS,
  CIRCLE_COLOR,
  CIRCLE_COLOR_LOW,
  CIRCLE_COLOR_MID,
  CIRCLE_COLOR_HIGH,
  CIRCLE_OPACITY,
  CIRCLE_STROKE_COLOR,
  CIRCLE_STROKE_WIDTH,
  CIRCLE_MIN_RADIUS,
  CIRCLE_MAX_RADIUS,
  HIT_AREA_RADIUS,
  PULSE_START_RADIUS,
  CITY_ZOOM_THRESHOLD,
} from '../../lib/mapConfig';

interface CircleLayerProps {
  data: CBDFeatureCollection;
  /** One averaged feature per city — shown below CITY_ZOOM_THRESHOLD */
  cityData: CityAggFeatureCollection;
  activeMetric: MetricKey;
  /** ID of the currently selected CBD, or null. Used to filter the pulse ring. */
  selectedCBDId: string | null;
  /** Slugified city ID of the currently hovered city circle, or null. */
  hoveredCityId: string | null;
}

export function CircleLayer({ data, cityData, activeMetric, selectedCBDId, hoveredCityId }: CircleLayerProps) {
  const metricConfig = getMetricConfig(activeMetric);

  /**
   * Shared color expression — reused by both city and CBD layers.
   * Maps the active metric value to a 3-stop diverging scale:
   *   low → blue, midpoint → amber, high → Gensler red.
   *
   * Because CityAggProperties extends CBDMetrics, the same metric keys exist
   * on city features, so this expression works unchanged for both layers.
   */
  const colorExpression: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', activeMetric], metricConfig.min],
    metricConfig.min,                          CIRCLE_COLOR_LOW,
    (metricConfig.min + metricConfig.max) / 2, CIRCLE_COLOR_MID,
    metricConfig.max,                          CIRCLE_COLOR_HIGH,
  ];

  // ---------------------------------------------------------------------------
  // City-level paint specs (visible below CITY_ZOOM_THRESHOLD)
  // ---------------------------------------------------------------------------

  /**
   * City circles are slightly larger than the max individual CBD circle so
   * they're easy to tap at global zoom. The same interpolate expression sizes
   * them by the city's averaged metric value.
   */
  const cityCirclePaint: CircleLayerSpecification['paint'] = {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', activeMetric], metricConfig.min],
      metricConfig.min, CIRCLE_MIN_RADIUS + 2,
      metricConfig.max, CIRCLE_MAX_RADIUS + 6,
    ],
    'circle-radius-transition': { duration: 400, delay: 0 },
    'circle-color': colorExpression,
    'circle-color-transition': { duration: 400, delay: 0 },
    'circle-opacity': CIRCLE_OPACITY,
    'circle-stroke-color': CIRCLE_STROKE_COLOR,
    'circle-stroke-width': CIRCLE_STROKE_WIDTH,
  };

  const cityHitAreaPaint: CircleLayerSpecification['paint'] = {
    'circle-radius': HIT_AREA_RADIUS,
    'circle-opacity': 0,
    'circle-stroke-width': 0,
  };

  // ---------------------------------------------------------------------------
  // Individual CBD paint specs (visible at or above CITY_ZOOM_THRESHOLD)
  // ---------------------------------------------------------------------------

  const visibleCirclePaint: CircleLayerSpecification['paint'] = {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', activeMetric], metricConfig.min],
      metricConfig.min, CIRCLE_MIN_RADIUS,
      metricConfig.max, CIRCLE_MAX_RADIUS,
    ],
    'circle-radius-transition': { duration: 400, delay: 0 },
    'circle-color': colorExpression,
    'circle-color-transition': { duration: 400, delay: 0 },
    'circle-opacity': CIRCLE_OPACITY,
    'circle-opacity-transition': { duration: 400, delay: 0 },
    'circle-stroke-color': CIRCLE_STROKE_COLOR,
    'circle-stroke-width': CIRCLE_STROKE_WIDTH,
  };

  const hitAreaPaint: CircleLayerSpecification['paint'] = {
    'circle-radius': HIT_AREA_RADIUS,
    'circle-opacity': 0,
    'circle-stroke-width': 0,
  };

  // ---------------------------------------------------------------------------
  // Pulse ring (individual CBD layer only)
  // ---------------------------------------------------------------------------

  /**
   * Pulse ring — initial paint only. The animation loop in MapView.tsx
   * updates circle-radius and circle-stroke-opacity on every frame via
   * map.setPaintProperty(), bypassing React for performance.
   */
  const pulsePaint: CircleLayerSpecification['paint'] = {
    'circle-radius': PULSE_START_RADIUS,
    'circle-color': 'transparent',
    'circle-opacity': 0,
    'circle-stroke-color': CIRCLE_COLOR,
    'circle-stroke-width': 2.5,
    'circle-stroke-opacity': 0,
  };

  const pulseFilter: CircleLayerSpecification['filter'] = [
    '==',
    ['get', 'id'],
    selectedCBDId ?? '',
  ];

  // ---------------------------------------------------------------------------
  // City hover ring
  // ---------------------------------------------------------------------------

  /**
   * A white outline ring rendered above the hovered city circle.
   * Uses the same radius expression as cityCirclePaint so the ring sits flush
   * against the edge of the colored circle.
   * The filter restricts it to the single hovered city feature.
   */
  const cityHoverRingPaint: CircleLayerSpecification['paint'] = {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', activeMetric], metricConfig.min],
      metricConfig.min, CIRCLE_MIN_RADIUS + 2,
      metricConfig.max, CIRCLE_MAX_RADIUS + 6,
    ],
    'circle-color': 'transparent',
    'circle-opacity': 0,
    'circle-stroke-color': 'rgba(255,255,255,0.9)',
    'circle-stroke-width': 2.5,
  };

  const cityHoverFilter: CircleLayerSpecification['filter'] = [
    '==',
    ['get', 'id'],
    hoveredCityId ?? '',
  ];

  return (
    <>
      {/*
        CITY-LEVEL SOURCE + LAYERS
        Visible only below CITY_ZOOM_THRESHOLD (maxzoom prop).
        MapLibre hides these layers automatically when the user zooms in past
        the threshold — no JavaScript needed.
      */}
      <Source id={SOURCE_IDS.cities} type="geojson" data={cityData}>
        <Layer
          id={LAYER_IDS.cityCircles}
          type="circle"
          paint={cityCirclePaint}
          maxzoom={CITY_ZOOM_THRESHOLD}
        />
        {/* Hover ring — sits above the colored circle, filtered to the hovered city */}
        <Layer
          id={LAYER_IDS.cityHoverRing}
          type="circle"
          paint={cityHoverRingPaint}
          filter={cityHoverFilter}
          maxzoom={CITY_ZOOM_THRESHOLD}
        />
        <Layer
          id={LAYER_IDS.cityCircleHitArea}
          type="circle"
          paint={cityHitAreaPaint}
          maxzoom={CITY_ZOOM_THRESHOLD}
        />
      </Source>

      {/*
        INDIVIDUAL CBD SOURCE + LAYERS
        Visible only at or above CITY_ZOOM_THRESHOLD (minzoom prop).
        The pulse ring sits below the visible circles (rendered first = drawn first).
      */}
      <Source id={SOURCE_IDS.cbds} type="geojson" data={data}>
        <Layer
          id={LAYER_IDS.selectedPulse}
          type="circle"
          paint={pulsePaint}
          filter={pulseFilter}
          minzoom={CITY_ZOOM_THRESHOLD}
        />
        <Layer
          id={LAYER_IDS.circles}
          type="circle"
          paint={visibleCirclePaint}
          minzoom={CITY_ZOOM_THRESHOLD}
        />
        <Layer
          id={LAYER_IDS.circleHitArea}
          type="circle"
          paint={hitAreaPaint}
          minzoom={CITY_ZOOM_THRESHOLD}
        />
      </Source>
    </>
  );
}
