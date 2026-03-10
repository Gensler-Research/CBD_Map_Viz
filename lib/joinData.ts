/**
 * lib/joinData.ts
 *
 * Loads and validates the CBD dataset, and computes aggregate statistics.
 *
 * WHY THIS FILE EXISTS:
 * The CLAUDE.md spec describes a join step where GeoJSON features and a
 * separate metrics.json are merged at runtime. In our actual dataset, the
 * metrics are already embedded in the GeoJSON properties — so this file is a
 * thin adapter that casts the raw JSON to our typed structures and computes
 * derived data (global averages, full value arrays for percentile ranking).
 *
 * DATA LOADING:
 * The GeoJSON is read server-side in `app/page.tsx` using `fs.readFileSync`,
 * then passed as a serialised prop to MapApp (Client Component).
 * This avoids bundler issues with non-standard file extensions (.geojson)
 * in Turbopack. The `parseGeoJSON` function here handles the parsing step.
 *
 * If the data format ever changes (e.g. a real metrics.json is introduced),
 * this is the only file that needs updating.
 */

import type {
  CBDFeature,
  CBDFeatureCollection,
  CBDMetrics,
  CityAggFeature,
  CityAggFeatureCollection,
  MetricKey,
  GlobalAverages,
  Region,
} from '../types/cbd';
import { METRICS } from './metricConfig';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a raw JSON string (read from the .geojson file on the server) into
 * our typed FeatureCollection. Called once in page.tsx via readFileSync —
 * no bundler involved, so the .geojson extension causes no issues.
 */
export function parseGeoJSON(raw: string): CBDFeatureCollection {
  return JSON.parse(raw) as CBDFeatureCollection;
}

/**
 * Compute the mean value for each MetricKey across the entire dataset.
 * This runs once when the app loads and the result is stored in React Context
 * so it never needs to be recalculated.
 */
export function computeGlobalAverages(
  data: CBDFeatureCollection,
): GlobalAverages {
  // Build a partial result and fill it in — TypeScript requires all keys,
  // which we guarantee by iterating over METRICS (which covers every MetricKey).
  const result = {} as GlobalAverages;

  for (const metric of METRICS) {
    const values = data.features
      .map((f) => f.properties[metric.key])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    result[metric.key] =
      values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : 0;
  }

  return result;
}

/**
 * Group individual CBD features by city and compute one aggregate feature
 * per city. All metric values are the arithmetic mean of each city's CBDs.
 * Coordinates are the centroid (average lng/lat) of those CBDs.
 *
 * WHY THIS EXISTS:
 * At global zoom levels, cities like New York, Tokyo, or London have multiple
 * CBDs so close together they overlap as separate circles. A single city-level
 * circle with averaged metrics is far more readable at that scale. When the
 * user zooms in past CITY_ZOOM_THRESHOLD, we switch to the individual CBD layer.
 */
export function computeCityAggregates(
  data: CBDFeatureCollection,
): CityAggFeatureCollection {
  // All eight metric keys that exist on CBDMetrics
  const METRIC_KEYS: (keyof CBDMetrics)[] = [
    'stickinessScore',
    'cbdGreatExperience',
    'enthusiastPct',
    'reluctantVisitorPct',
    'errandRunnerPct',
    'specialEventVisitorPct',
    'vibrantPct',
    'lingeringPct',
  ];

  // Group features by city name
  const cityMap = new Map<string, CBDFeature[]>();
  for (const feature of data.features) {
    const { city } = feature.properties;
    if (!cityMap.has(city)) cityMap.set(city, []);
    cityMap.get(city)!.push(feature);
  }

  const features: CityAggFeature[] = [];

  for (const [city, cityFeatures] of cityMap) {
    // Centroid: average of each CBD's coordinates within the city
    const lngSum = cityFeatures.reduce(
      (s, f) => s + f.geometry.coordinates[0], 0,
    );
    const latSum = cityFeatures.reduce(
      (s, f) => s + f.geometry.coordinates[1], 0,
    );
    const lng = lngSum / cityFeatures.length;
    const lat = latSum / cityFeatures.length;

    // Average every metric across the city's CBDs
    const avgMetrics = {} as CBDMetrics;
    for (const key of METRIC_KEYS) {
      const vals = cityFeatures
        .map((f) => f.properties[key])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));
      avgMetrics[key] = vals.length > 0
        ? vals.reduce((s, v) => s + v, 0) / vals.length
        : 0;
    }

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        // Slugify the city name for use as a stable ID
        id: city.toLowerCase().replace(/[\s,]+/g, '-'),
        city,
        region: cityFeatures[0].properties.region as Region,
        cbdCount: cityFeatures.length,
        ...avgMetrics,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Return all numeric values for a given metric key.
 * Used to compute percentile rankings in the side panel.
 */
export function getAllMetricValues(
  data: CBDFeatureCollection,
  key: MetricKey,
): number[] {
  return data.features
    .map((f) => f.properties[key])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
}
