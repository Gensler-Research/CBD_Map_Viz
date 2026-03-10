/**
 * lib/metricConfig.ts
 *
 * Single source of truth for the four switchable metrics.
 *
 * WHY THIS FILE EXISTS:
 * Every part of the app that deals with metrics — the map circle sizes,
 * the side panel cards, the metric switcher dropdown — needs the same
 * labels, descriptions, and min/max ranges. Defining them once here means
 * you can change a label in one place and it updates everywhere.
 */

import type { MetricConfig } from '../types/cbd';

export const METRICS: MetricConfig[] = [
  {
    key: 'stickinessScore',
    label: 'Stickiness Score',
    description:
      'Combined measure of visit frequency and duration of stay, scaled 0–100.',
    unit: '',
    min: 35,
    max: 70,
  },
  {
    key: 'cbdGreatExperience',
    label: 'Great Experience',
    description:
      '% of residents who agree their CBD offers a great experience.',
    unit: '%',
    min: 30,
    max: 100,
  },
  {
    key: 'enthusiastPct',
    label: 'Enthusiasts',
    description:
      '% of residents who visit frequently and stay for extended periods.',
    unit: '%',
    min: 0,
    max: 30,
  },
  {
    key: 'vibrantPct',
    label: 'Vibrancy',
    description: '% of residents who rate their CBD as vibrant.',
    unit: '%',
    min: 40,
    max: 100,
  },
];

/**
 * Convenience lookup: get a metric config by its key.
 * The non-null assertion (!) is safe here because MetricKey is a closed union —
 * every valid key is guaranteed to exist in the METRICS array.
 */
export function getMetricConfig(key: string): MetricConfig {
  const config = METRICS.find((m) => m.key === key);
  if (!config) throw new Error(`Unknown metric key: ${key}`);
  return config;
}
