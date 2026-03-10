/**
 * components/SidePanel/SidePanel.tsx
 *
 * Slides in from the right when a CBD is selected. Displays metric cards
 * and persona breakdown for the selected CBD.
 *
 * OPEN/CLOSE BEHAVIOUR:
 * SidePanel is always mounted in the DOM (not conditionally rendered).
 * Opening/closing is controlled purely by CSS using a data-open attribute.
 * This approach:
 *   - Allows CSS transitions (you can't transition an element that doesn't exist)
 *   - Keeps the DOM stable (no mount/unmount flicker)
 *   - Makes the animation logic zero lines of JavaScript
 *
 * The panel's width transition causes the parent flex container to resize the
 * map container simultaneously — no JavaScript needed for the "push" effect.
 *
 * LAYOUT RELATIONSHIP:
 * SidePanel is a flex sibling of MapView inside MapApp. MapView has flex: 1
 * (takes all remaining space). As SidePanel animates from width 0 to
 * var(--panel-width), MapView automatically shrinks to accommodate it.
 */

'use client';

import { useMapContext } from '../../lib/MapContext';
import { METRICS } from '../../lib/metricConfig';
import { STRINGS } from '../../constants/strings';
import { MetricCard } from './MetricCard';
import { PersonaSplit } from './PersonaSplit';
import styles from './SidePanel.module.css';

export function SidePanel() {
  const { selectedCBD, globalAverages, allMetricValues, resetToGlobal } =
    useMapContext();

  const isOpen = selectedCBD !== null;

  return (
    /*
     * data-open is a custom HTML attribute. Our CSS uses [data-open="true"]
     * as a selector to apply the "open" styles. This is cleaner than toggling
     * class names because the state is visible in DevTools as an attribute.
     */
    <aside
      className={styles.panel}
      data-open={String(isOpen)}
      aria-label="CBD detail panel"
      aria-hidden={!isOpen}
    >
      {/*
        We render the inner content only when a CBD is selected to avoid
        reading undefined values. Since the panel animates open before React
        re-renders, there's a brief moment the inner div is empty — the CSS
        overflow: hidden on .panel hides this during the animation.
      */}
      {selectedCBD && (
        <div className={styles.inner}>
          {/* Return to global view button — closes panel and resets camera */}
          <button
            className={styles.returnButton}
            onClick={resetToGlobal}
            aria-label={STRINGS.sidePanel.returnToGlobalViewAriaLabel}
          >
            {STRINGS.sidePanel.returnToGlobalView}
          </button>

          {/* CBD identity header */}
          <header className={styles.header}>
            <h2 className={styles.districtName}>{selectedCBD.district}</h2>
            <p className={styles.cityLine}>{selectedCBD.city}</p>
            <span className={styles.regionTag}>{selectedCBD.region}</span>
          </header>

          {/* Four metric cards */}
          <section className={styles.metrics} aria-label="Metric scores">
            {METRICS.map((metric) => (
              <MetricCard
                key={metric.key}
                metric={metric}
                value={selectedCBD[metric.key]}
                globalAverage={globalAverages[metric.key]}
                allValues={allMetricValues[metric.key]}
              />
            ))}
          </section>

          {/* Visitor persona stacked bar */}
          <PersonaSplit
            cbd={selectedCBD}
            globalAvgEnthusiast={globalAverages.enthusiastPct}
          />
        </div>
      )}
    </aside>
  );
}
