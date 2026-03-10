/**
 * types/cbd.ts
 *
 * Central TypeScript type definitions for the entire app.
 *
 * WHY THIS FILE EXISTS:
 * TypeScript lets you define the "shape" of your data so the editor can
 * catch mistakes before you run the code. By putting all types here, every
 * other file imports from one place — if the data ever changes, you update
 * types here and TypeScript tells you everywhere else that needs fixing.
 */

import type { Feature, FeatureCollection, Point } from 'geojson';

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

/**
 * The five global regions used in the dataset.
 * Using a union type (|) means TypeScript will error if you typo a region name.
 */
export type Region =
  | 'North America'
  | 'Europe'
  | 'Asia Pacific'
  | 'Latin/South America'
  | 'Middle East/Africa';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * The eight numeric metrics stored on every CBD feature.
 * These come directly from the GeoJSON properties.
 */
export interface CBDMetrics {
  stickinessScore: number;
  cbdGreatExperience: number;
  enthusiastPct: number;
  reluctantVisitorPct: number;
  errandRunnerPct: number;
  specialEventVisitorPct: number;
  vibrantPct: number;
  lingeringPct: number;
}

// ---------------------------------------------------------------------------
// GeoJSON Feature Properties
// ---------------------------------------------------------------------------

/**
 * Everything stored in the "properties" object of each GeoJSON point feature.
 * CBDMetrics is extended here (using "extends") so every metric field is
 * included alongside the identity fields.
 *
 * Note: The GeoJSON file uses "district" for the CBD name (e.g. "Midtown
 * Manhattan") and does not include a country field.
 */
export interface CBDProperties extends CBDMetrics {
  id: string;
  district: string;
  city: string;
  country?: string; // optional — not present in current dataset
  region: Region;
  perceptionBehaviorGap: number;
  dataSource: string;
}

// ---------------------------------------------------------------------------
// Typed GeoJSON Feature & Collection
// ---------------------------------------------------------------------------

/**
 * A single CBD represented as a GeoJSON Point feature.
 * We use the generic Feature<Geometry, Properties> type from the 'geojson'
 * package so we get proper typing on both .geometry and .properties.
 */
export type CBDFeature = Feature<Point, CBDProperties>;

/**
 * The full collection of CBD features — what gets loaded from the GeoJSON file
 * and passed into MapLibre as a data source.
 */
export type CBDFeatureCollection = FeatureCollection<Point, CBDProperties>;

// ---------------------------------------------------------------------------
// City-level aggregates
// ---------------------------------------------------------------------------

/**
 * Properties on a city aggregate feature — one per city, all metric values
 * are the mean of every CBD in that city.
 *
 * We extend CBDMetrics so the same MapLibre `['get', activeMetric]` expressions
 * used on individual CBD layers work unchanged on city layers too.
 */
export interface CityAggProperties extends CBDMetrics {
  /** Slugified city name — e.g. "new-york" */
  id: string;
  city: string;
  region: Region;
  /** How many individual CBDs were averaged to produce this feature */
  cbdCount: number;
}

export type CityAggFeature = Feature<Point, CityAggProperties>;
export type CityAggFeatureCollection = FeatureCollection<Point, CityAggProperties>;

// ---------------------------------------------------------------------------
// Metric Config
// ---------------------------------------------------------------------------

/**
 * The four metrics that the user can switch between in the map UI.
 * This is a subset of CBDMetrics — only these four size the circles.
 */
export type MetricKey =
  | 'stickinessScore'
  | 'cbdGreatExperience'
  | 'enthusiastPct'
  | 'vibrantPct';

/**
 * Configuration for a single metric: its label, description, display unit,
 * and the min/max range used to scale circle sizes on the map.
 */
export interface MetricConfig {
  key: MetricKey;
  label: string;
  description: string;
  unit: string; // '' for raw scores, '%' for percentages
  min: number;
  max: number;
}

// ---------------------------------------------------------------------------
// Global Averages
// ---------------------------------------------------------------------------

/**
 * A Record is a TypeScript utility type that creates an object type with
 * specific keys. This says: "an object that has a number value for every
 * MetricKey". Computed once on startup from the full dataset.
 */
export type GlobalAverages = Record<MetricKey, number>;
