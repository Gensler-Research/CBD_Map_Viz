/**
 * components/SidePanel/MetricCard.tsx
 *
 * Displays a single metric for the selected CBD — value, gauge bar,
 * comparison to global average, and percentile rank.
 *
 * PROPS vs CONTEXT:
 * MetricCard receives its data via props rather than reading from context
 * directly. This is deliberate — it makes the component "dumb" (pure and
 * reusable) and easier to test. The parent (SidePanel) is the one that
 * knows about context and passes the right values down.
 *
 * CSS CUSTOM PROPERTIES FOR DYNAMIC VALUES:
 * The gauge bar's fill width is a calculated percentage. We can't express
 * that purely in CSS without knowing the value. The pattern we use:
 *   - Pass the percentage as a CSS custom property via the style attribute
 *   - Use that property in the CSS module with var(--fill-width)
 * This keeps the CSS in the CSS file (not inline) while still allowing
 * data-driven styles. CLAUDE.md permits inline styles only for dynamic values
 * passed as CSS custom properties — this is exactly that pattern.
 */

import {
  formatMetricValue,
  formatComparison,
  computePercentile,
  formatPercentile,
  computeBarFill,
} from '../../lib/formatters';
import type { MetricConfig } from '../../types/cbd';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  metric: MetricConfig;
  value: number;
  globalAverage: number;
  /** All values for this metric — used to calculate percentile rank */
  allValues: number[];
}

export function MetricCard({
  metric,
  value,
  globalAverage,
  allValues,
}: MetricCardProps) {
  const fillPct = computeBarFill(value, metric);
  const avgFillPct = computeBarFill(globalAverage, metric);
  const percentile = computePercentile(value, allValues);

  return (
    <div className={styles.card}>
      {/* Header row: metric label on left, large value on right */}
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value}>
          {formatMetricValue(value, metric.unit)}
        </span>
      </div>

      {/*
        Gauge bar container.
        --fill-width and --avg-width are CSS custom properties used by the
        CSS module to set the bar widths without inline styles in the CSS file.
      */}
      <div className={styles.barTrack}>
        {/* Coloured fill showing this CBD's value */}
        <div
          className={styles.barFill}
          style={{ '--fill-width': `${fillPct}%` } as React.CSSProperties}
          aria-hidden="true"
        />
        {/*
          Global average marker — a short vertical tick on the bar.
          Positioned at the average's percentage using left: var(--avg-pos).
        */}
        <div
          className={styles.avgMarker}
          style={{ '--avg-pos': `${avgFillPct}%` } as React.CSSProperties}
          aria-hidden="true"
        />
      </div>

      {/* Footer row: comparison text on left, percentile on right */}
      <div className={styles.footer}>
        <span className={styles.comparison}>
          {formatComparison(value, globalAverage, metric.unit)}
        </span>
        <span className={styles.percentile}>
          {formatPercentile(percentile)}
        </span>
      </div>
    </div>
  );
}
