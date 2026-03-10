/**
 * components/Map/ContinentMarkers.tsx
 *
 * Renders a clickable label at the centre of each continent/region, visible
 * only when the map is zoomed far enough out to see the whole world.
 *
 * WHY HTML MARKERS INSTEAD OF A MAPLIBRE SYMBOL LAYER?
 * MapLibre symbol layers that display text require a "glyphs" URL in the
 * map style config (a PBF font source). Our custom raster style doesn't
 * include one, so using a symbol layer would produce blank text.
 *
 * react-map-gl's <Marker> component renders an HTML element that MapLibre
 * positions on the canvas using the map's projection. Because it's plain
 * HTML we can style it with CSS Modules and attach a normal React onClick
 * handler — no MapLibre interactiveLayerIds needed.
 *
 * VISIBILITY:
 * The parent (MapView) passes a `visible` prop controlled by the current
 * map zoom. When false, this component renders nothing. The threshold is
 * CONTINENT_ZOOM_MAX in mapConfig.ts.
 */

'use client';

import { Marker } from 'react-map-gl/maplibre';
import { CONTINENTS } from '../../lib/mapConfig';
import styles from './ContinentMarkers.module.css';

interface ContinentMarkersProps {
  /** Called when the user clicks a continent button */
  onContinentClick: (center: [number, number], flyToZoom: number) => void;
  /** Whether to render anything — controlled by map zoom in MapView */
  visible: boolean;
}

export function ContinentMarkers({ onContinentClick, visible }: ContinentMarkersProps) {
  // Return null rather than rendering invisible markers — MapLibre still has
  // to project and position markers even when they're hidden, so removing them
  // entirely is more efficient at the globe zoom level.
  if (!visible) return null;

  return (
    <>
      {CONTINENTS.map((continent) => (
        /*
         * <Marker> positions an HTML element at a [longitude, latitude]
         * coordinate on the map canvas. anchor="center" means the element's
         * own centre point is placed at those coordinates (as opposed to
         * "bottom", which would place the element's bottom edge there).
         */
        <Marker
          key={continent.id}
          longitude={continent.center[0]}
          latitude={continent.center[1]}
          anchor="center"
        >
          <button
            className={styles.label}
            onClick={() => onContinentClick(continent.center, continent.flyToZoom)}
            aria-label={`Zoom to ${continent.name}`}
          >
            {continent.name}
          </button>
        </Marker>
      ))}
    </>
  );
}
