/**
 * lib/mapConfig.ts
 *
 * All MapLibre-specific constants in one place.
 *
 * WHY THIS FILE EXISTS:
 * MapLibre uses string IDs to identify sources and layers. If you type those
 * strings in multiple places and make a typo, you'll get a silent bug.
 * Defining them as typed constants here means the editor will catch any
 * misspelling, and changing an ID is a one-line edit.
 *
 * When Gensler provides a brand-approved map style, update MAP_STYLE_URL here
 * and nothing else in the codebase needs to change.
 */

// ---------------------------------------------------------------------------
// Map tile style
// ---------------------------------------------------------------------------

/**
 * The URL for the MapLibre tile style.
 * Currently using the MapLibre demo tiles as a neutral placeholder.
 * Replace this with the Gensler-approved style URL when available.
 */
// "as const" narrows every string to its literal type (e.g. "raster" not string),
// which is required to satisfy MapLibre's StyleSpecification union types.
export const MAP_STYLE_URL = {
  version: 8 as const,
  sources: {
    carto: {
      type: "raster" as const,
      tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [
    {
      id: "carto-tiles",
      type: "raster" as const,
      source: "carto",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// ---------------------------------------------------------------------------
// Source and Layer IDs
// ---------------------------------------------------------------------------

/**
 * "as const" makes TypeScript treat these as exact string literals rather
 * than generic strings. This gives us better type safety when passing IDs
 * to MapLibre functions.
 */
export const SOURCE_IDS = {
  cbds: 'cbds-source',
  cities: 'cities-source',
  /** Rough bounding-box polygons — one per continent/region */
  continents: 'continents-source',
} as const;

export const LAYER_IDS = {
  /** The visible coloured circles */
  circles: 'cbd-circles',
  /** Transparent larger circles — used purely to give mobile users a bigger tap target */
  circleHitArea: 'cbd-circle-hit-area',
  /**
   * Pulse ring layer — rendered BELOW the visible circles.
   * Only the selected CBD is shown (filtered by id). Its radius and opacity
   * are driven by a requestAnimationFrame loop in MapView to create a
   * continuous ripple-outward effect.
   */
  selectedPulse: 'cbd-selected-pulse',
  /** City-level aggregate circles — visible at low zoom (< CITY_ZOOM_THRESHOLD) */
  cityCircles: 'city-circles',
  /** Transparent hit area for city circles — same zoom range as cityCircles */
  cityCircleHitArea: 'city-circle-hit-area',
  /** Hover highlight ring on the currently hovered city circle */
  cityHoverRing: 'city-hover-ring',
  /** Transparent fill used to capture mouse events over continent regions */
  continentFill: 'continent-fill',
  /** Outline border shown when a continent region is hovered */
  continentBorder: 'continent-border',
} as const;

/**
 * Below this zoom level the map shows one averaged circle per city.
 * At or above this level it switches to individual CBD circles.
 * Zoom 7 is far enough out to keep city circles separate, yet close enough
 * that zooming in feels like a natural "drill-down" into that city.
 */
export const CITY_ZOOM_THRESHOLD = 7;

/**
 * Below this zoom level, continent label buttons are visible on the map.
 * Above it, city circles take over as the primary navigation affordance.
 * Set just below CITY_ZOOM_THRESHOLD so the two levels don't overlap visually.
 */
export const CONTINENT_ZOOM_MAX = 4.5;

/**
 * One entry per major region in the dataset.
 * - center: [lng, lat] the camera flies to when the continent is clicked.
 * - flyToZoom: zoom level after flying — chosen so all city circles in that
 *   region are visible without too much empty ocean.
 */
export const CONTINENTS: Array<{
  id: string;
  name: string;
  center: [number, number];
  flyToZoom: number;
}> = [
  { id: 'north-america',       name: 'North America',       center: [-100,  30], flyToZoom: 3.5 },
  { id: 'europe',              name: 'Europe',              center: [  15,  52], flyToZoom: 4 },
  { id: 'asia-pacific',        name: 'Asia Pacific',        center: [ 112,  5], flyToZoom: 2.9},
  { id: 'latin-south-america', name: 'Latin/South America', center: [ -62, -25], flyToZoom: 3.1 },
  { id: 'middle-east-africa',  name: 'Middle East/Africa',  center: [  30,  3], flyToZoom: 3.2 },
];

/**
 * Zoom level the map flies to when the user clicks a city circle.
 * Must be clearly above CITY_ZOOM_THRESHOLD so individual CBDs appear.
 */
export const CITY_FLY_TO_ZOOM = 10;

// ---------------------------------------------------------------------------
// Initial map view
// ---------------------------------------------------------------------------

/** Where the map starts when the page loads */
export const MAP_INITIAL_VIEW = {
  longitude: 10,
  latitude: 20,
  zoom: 2.1,
};

// ---------------------------------------------------------------------------
// Circle appearance
// ---------------------------------------------------------------------------

/** Smallest circle radius (pixels) at the metric's minimum value */
export const CIRCLE_MIN_RADIUS = 6;

/** Largest circle radius (pixels) at the metric's maximum value */
export const CIRCLE_MAX_RADIUS = 16;

/**
 * Three-stop diverging color scale for circle fill.
 * Maps metric value range: low → mid → high
 *
 * Blue  = low performer  (needs attention)
 * Amber = mid / average  (neutral)
 * Red   = high performer (brand color)
 *
 * Adapted from ColorBrewer RdYlBu — readable on light basemaps,
 * accessible to most color-blind profiles.
 * Mirror these values as CSS custom properties in globals.css so the
 * MapLegend gradient matches the MapLibre circle colors exactly.
 */

// Sequential warm: light orange → orange → brand red
// Must mirror --color-scale-low/mid/high in app/globals.css exactly.
export const CIRCLE_COLOR_LOW   = '#fcec76'; // brand light orange (low)
export const CIRCLE_COLOR_MID   = '#f68b35'; // brand orange       (mid)
export const CIRCLE_COLOR_HIGH  = '#de2726'; // brand red          (high)

/** Brand accent for pulse/stroke — matches --color-accent in globals.css */
export const CIRCLE_COLOR = '#de2726';
export const CIRCLE_OPACITY = 0.85;
/** Semi-transparent dark — legible against every fill color in the scale */
export const CIRCLE_STROKE_COLOR = 'rgba(0,0,0,0.20)';
export const CIRCLE_STROKE_WIDTH = 1;

/** Hit-area radius — must be >= CIRCLE_MAX_RADIUS + comfortable margin */
export const HIT_AREA_RADIUS = 28;

// ---------------------------------------------------------------------------
// Pulse animation
// ---------------------------------------------------------------------------

/** Starting radius of the pulse ring (pixels) — matches max circle size */
export const PULSE_START_RADIUS = CIRCLE_MAX_RADIUS;

/** How far the ring expands outward from the starting radius (pixels) */
export const PULSE_EXPAND_BY = 22;

/** Peak opacity of the pulse ring at the start of each cycle */
export const PULSE_PEAK_OPACITY = 0.55;

/** Duration of one full pulse cycle in milliseconds */
export const PULSE_CYCLE_MS = 1600;

// ---------------------------------------------------------------------------
// Fly-to animation
// ---------------------------------------------------------------------------

/** Zoom level the map flies to when a CBD is selected */
export const FLY_TO_ZOOM = 11;

/**
 * Duration of the flyTo animation in milliseconds.
 * 1800ms gives the cubic ease-in-out curve enough time to feel smooth
 * without making the interaction feel sluggish.
 */
export const FLY_TO_DURATION = 1800;

/**
 * Controls how much MapLibre zooms out during the flight arc.
 * Default is 1.42 — a dramatic zoom-out "dive-bomb" effect.
 * 1.0 creates a smoother glide: the camera pans and zooms together
 * without an exaggerated zoom-out in the middle of the journey.
 */
export const FLY_TO_CURVE = 1.0;
