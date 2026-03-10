/**
 * components/Map/MetricSwitcher.tsx
 *
 * Dropdown control that lets users switch which metric sizes the map circles.
 *
 * POSITIONING:
 * This component is rendered inside the MapView container (position: relative)
 * and positioned absolutely in the top-left using CSS. This keeps it visually
 * "on" the map while being a normal DOM element (easier to style than a
 * MapLibre custom control).
 *
 * STATE:
 * The selected metric lives in MapContext. Changing it here triggers a
 * re-render of CircleLayer with new paint props, which MapLibre animates.
 *
 * MOBILE:
 * On small screens (<768px), the label is hidden and the select element
 * uses native OS styling (no custom dropdown arrow) for better touch UX.
 */

'use client';

import { useMapContext } from '../../lib/MapContext';
import { METRICS } from '../../lib/metricConfig';
import { STRINGS } from '../../constants/strings';
import type { MetricKey } from '../../types/cbd';
import styles from './MetricSwitcher.module.css';

export function MetricSwitcher() {
  const { activeMetric, setActiveMetric } = useMapContext();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    // We cast to MetricKey here because the <option> values are exactly
    // the metric keys defined in METRICS — the cast is safe.
    setActiveMetric(e.target.value as MetricKey);
  }

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="metric-switcher">
        {STRINGS.map.metricSwitcherLabel}
      </label>
      <select
        id="metric-switcher"
        className={styles.select}
        value={activeMetric}
        onChange={handleChange}
        aria-label={STRINGS.map.metricSwitcherLabel}
      >
        {METRICS.map((metric) => (
          <option key={metric.key} value={metric.key}>
            {metric.label}
          </option>
        ))}
      </select>
    </div>
  );
}
