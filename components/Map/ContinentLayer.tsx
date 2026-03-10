/**
 * components/Map/ContinentLayer.tsx
 *
 * Renders rough bounding-box polygons for each continent/region as MapLibre
 * source + layers. Two layers are added:
 *
 *   continentFill   — transparent fill that captures mouse events over the
 *                     whole region. Registered in MapView's interactiveLayerIds
 *                     so hover and click events fire reliably.
 *
 *   continentBorder — a line layer showing an accent-coloured border around
 *                     the hovered continent. Filtered by the `hoveredContinentId`
 *                     prop so only one border is visible at a time.
 *
 * WHY POLYGON REGIONS INSTEAD OF POINT MARKERS?
 * HTML <Marker> buttons (the previous approach) required the user to find and
 * click a small label. Polygon regions let the user hover anywhere over a
 * continent's rough area to see the border highlight — no label hunting needed.
 *
 * WHY BOUNDING BOXES?
 * Exact continent coastlines would add ~hundreds of kilobytes of GeoJSON.
 * Rectangular bounding boxes are a few bytes and are accurate enough for
 * regional navigation — users understand they are clicking a zone, not a
 * country border.
 *
 * ZOOM VISIBILITY:
 * Both layers use maxzoom={CONTINENT_ZOOM_MAX}. MapLibre automatically hides
 * them (and stops generating pointer events) when the user zooms past that
 * threshold, so city circles take over seamlessly.
 */

import { Source, Layer } from 'react-map-gl/maplibre';
import type {
  FillLayerSpecification,
  LineLayerSpecification,
} from 'maplibre-gl';
import {
  SOURCE_IDS,
  LAYER_IDS,
  CONTINENTS,
  CONTINENT_ZOOM_MAX,
  CIRCLE_COLOR,
} from '../../lib/mapConfig';

// ---------------------------------------------------------------------------
// Polygon GeoJSON — built from the CONTINENTS bounding boxes
// ---------------------------------------------------------------------------

/**
 * Rough bounding box [west, south, east, north] for each region.
 * Keyed by the same `id` used in CONTINENTS so they stay in sync.
 * These are deliberately simplified — they cover the land masses well enough
 * for hover detection without any ocean precision.
 */
const CONTINENT_BBOXES: Record<string, [number, number, number, number]> = {
  'north-america':       [-170,  15,  -50,  75],
  'europe':              [ -30,  35,   45,  72],
  'asia-pacific':        [  45, -55,  175,  60],
  'latin-south-america': [ -90, -60,  -30,  15],
  'middle-east-africa':  [ -20, -40,   60,  40],
};

/** Convert a [west, south, east, north] bbox into a closed GeoJSON Polygon. */
function bboxToPolygon(bbox: [number, number, number, number]) {
  const [west, south, east, north] = bbox;
  return {
    type: 'Polygon' as const,
    // A polygon ring must start and end at the same point (closed ring)
    coordinates: [
      [[west, south], [east, south], [east, north], [west, north], [west, south]],
    ],
  };
}

const continentGeoJSON = {
  type: 'FeatureCollection' as const,
  features: CONTINENTS.map((c) => ({
    type: 'Feature' as const,
    // Store center + flyToZoom in properties so the click handler in MapView
    // can look them up without needing to re-import CONTINENTS.
    properties: { id: c.id, name: c.name, flyToZoom: c.flyToZoom },
    geometry: bboxToPolygon(CONTINENT_BBOXES[c.id]),
  })),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ContinentLayerProps {
  /** ID of the continent the cursor is currently over, or null */
  hoveredContinentId: string | null;
}

export function ContinentLayer({ hoveredContinentId }: ContinentLayerProps) {
  /**
   * Transparent fill — zero opacity so nothing is drawn, but the layer still
   * participates in MapLibre's hit-testing, allowing mouse events to fire.
   */
  const fillPaint: FillLayerSpecification['paint'] = {
    'fill-color': '#000000',
    'fill-opacity': 0,
  };

  /**
   * Border line — only rendered for the hovered continent (see filter below).
   * Uses the brand accent colour at reduced opacity so it reads as a
   * "selection hint" rather than a hard boundary.
   */
  const borderPaint: LineLayerSpecification['paint'] = {
    'line-color': CIRCLE_COLOR,
    'line-width': 2,
    'line-opacity': 0.65,
  };

  /**
   * Filter expression: show the border only for the continent whose `id`
   * property matches `hoveredContinentId`. When hoveredContinentId is null
   * we pass an empty string which matches no feature, so no border is drawn.
   */
  const borderFilter: LineLayerSpecification['filter'] = [
    '==',
    ['get', 'id'],
    hoveredContinentId ?? '',
  ];

  return (
    <Source id={SOURCE_IDS.continents} type="geojson" data={continentGeoJSON}>
      {/*
        Fill layer — drawn first (below the border) so the transparent area
        receives pointer events across the entire region.
      */}
      <Layer
        id={LAYER_IDS.continentFill}
        type="fill"
        paint={fillPaint}
        maxzoom={CONTINENT_ZOOM_MAX}
      />
      {/*
        Border layer — only visible for the hovered continent via the filter.
        Rendered above the fill so it sits on top of the base map tiles.
      */}
      <Layer
        id={LAYER_IDS.continentBorder}
        type="line"
        paint={borderPaint}
        filter={borderFilter}
        maxzoom={CONTINENT_ZOOM_MAX}
      />
    </Source>
  );
}
