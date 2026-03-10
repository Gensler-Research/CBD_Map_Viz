/**
 * components/Map/MapLegend.tsx
 *
 * A floating legend that explains what the circle colors mean for the
 * currently active metric. It lives in the bottom-left corner of the map.
 *
 * WHAT IT SHOWS:
 *   - The metric name (e.g. "Stickiness Score")
 *   - A gradient bar that matches the 3-stop color scale on the map circles
 *   - Min / max labels at each end of the bar
 *   - A marker showing the global average position on the bar
 *
 * HOW THE GRADIENT POSITION IS COMPUTED:
 *   The global average for the active metric is stored in React context
 *   (computed once on load, never recalculated). We convert it to a
 *   percentage along the [min, max] range:
 *
 *     position = (avg - min) / (max - min) * 100
 *
 *   That percentage drives the CSS custom property --avg-pos, which
 *   positions the marker with `left: var(--avg-pos)`.
 *
 * WHY CSS CUSTOM PROPERTIES FOR POSITION?
 *   CSS Modules don't allow JavaScript values inside CSS. The workaround
 *   is to pass dynamic values via inline `style` on the element, using
 *   CSS custom properties. The `.module.css` file then references those
 *   properties with `var(--avg-pos)`.
 */

'use client';

import { useMapContext } from '../../lib/MapContext';
import { getMetricConfig } from '../../lib/metricConfig';
import { formatMetricValue } from '../../lib/formatters';
import styles from './MapLegend.module.css';

export function MapLegend() {
  const { activeMetric, globalAverages } = useMapContext();
  const metricConfig = getMetricConfig(activeMetric);

  const avg = globalAverages[activeMetric];
  const { min, max, label, unit } = metricConfig;

  /**
   * Convert the global average to a 0–100% position along the gradient bar.
   * We clamp it to [0, 100] so it never overflows the bar even if the average
   * somehow sits outside the configured min/max range.
   */
  const avgPct = Math.min(100, Math.max(0,
    ((avg - min) / (max - min)) * 100
  ));

  return (
    <div className={styles.legend}>
      {/* Metric name — updates when the user switches metrics */}
      <p className={styles.title}>{label}</p>

      {/* Gradient bar + average marker */}
      <div className={styles.barWrapper}>
        {/*
          The gradient bar is styled entirely in CSS using the
          --color-scale-* custom properties defined in globals.css.
          No colors are hardcoded in this component.
        */}
        <div className={styles.bar} />

        {/*
          Average marker — a vertical tick that floats above the bar.
          Its horizontal position is driven by the --avg-pos CSS custom
          property, which we set via the `style` prop.
        */}
        <div
          className={styles.avgMarker}
          style={{ '--avg-pos': `${avgPct}%` } as React.CSSProperties}
          aria-label={`Global average: ${formatMetricValue(avg, unit)}`}
        >
          <span className={styles.avgLabel}>
            avg {formatMetricValue(avg, unit)}
          </span>
          <div className={styles.avgTick} />
        </div>
      </div>

      {/* Min / max labels */}
      <div className={styles.rangeLabels}>
        <span>{formatMetricValue(min, unit)}</span>
        <span>{formatMetricValue(max, unit)}</span>
      </div>
    </div>
  );
}
