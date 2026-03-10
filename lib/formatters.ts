/**
 * lib/formatters.ts
 *
 * Pure functions for formatting numbers and computing statistics.
 *
 * WHY THIS FILE EXISTS:
 * "Pure functions" (no side effects, same input → same output) are the
 * easiest code to test and reuse. Keeping all number-wrangling here means
 * components stay clean — they just call a formatter and render the result.
 */

import type { MetricConfig } from '../types/cbd';

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------

/**
 * Format a metric value for display.
 * Examples:
 *   formatMetricValue(50.46, '')  → '50'
 *   formatMetricValue(80.76, '%') → '81%'
 */
export function formatMetricValue(value: number, unit: string): string {
  if (unit === '%') {
    return `${Math.round(value)}%`;
  }
  return String(Math.round(value));
}

// ---------------------------------------------------------------------------
// Comparison to global average
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable comparison string.
 * Examples:
 *   '3.2 pts above global avg'
 *   '1.8% below global avg'
 */
export function formatComparison(
  value: number,
  average: number,
  unit: string,
): string {
  const diff = value - average;
  const absDiff = Math.round(Math.abs(diff));
  const direction = diff >= 0 ? 'above' : 'below';
  const label = unit === '%' ? `${absDiff}%` : `${absDiff} pts`;
  return `${label} ${direction} global avg`;
}

// ---------------------------------------------------------------------------
// Percentile calculation
// ---------------------------------------------------------------------------

/**
 * Given a value and the full array of values for a metric, return a
 * percentile rank from 0–100.
 *
 * Percentile = (number of values ≤ this value) / total values × 100
 * A percentile of 82 means this CBD scores better than 82% of the dataset.
 */
export function computePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 0;
  const countBelow = allValues.filter((v) => v <= value).length;
  return Math.round((countBelow / allValues.length) * 100);
}

/**
 * Format a percentile rank as a "top X%" string.
 * A percentile of 82 → "Top 18% globally"
 */
export function formatPercentile(percentile: number): string {
  if (percentile >= 80) {
    const topPct = Math.max(1, Math.round(100 - percentile));
    return `Top ${topPct}% globally`;
  } else if (percentile <= 20) {
    const bottomPct = Math.max(1, Math.round(percentile));
    return `Bottom ${bottomPct}% globally`;
  } else {
    return ``;
  }
}

// ---------------------------------------------------------------------------
// Bar/gauge fill
// ---------------------------------------------------------------------------

/**
 * Convert a raw metric value into a 0–100 percentage for the gauge bar,
 * clamped so it never goes below 0% or above 100%.
 *
 * Uses the metric config's min/max range as the scale.
 */
export function computeBarFill(value: number, config: MetricConfig): number {
  const range = config.max - config.min;
  if (range === 0) return 0;
  return Math.min(100, Math.max(0, ((value - config.min) / range) * 100));
}
