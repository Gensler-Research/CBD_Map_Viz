/**
 * components/Tooltip/HoverTooltip.tsx
 *
 * Lightweight tooltip shown near the cursor when hovering a CBD circle.
 *
 * POSITIONING APPROACH:
 * The tooltip is positioned relative to the MapView container using CSS custom
 * properties --tooltip-x and --tooltip-y. The container has position: relative,
 * and this element uses position: absolute with those values.
 *
 * We offset the tooltip 12px right and above the cursor so it doesn't sit
 * directly under the pointer (which would cause it to flicker as the cursor
 * moves over it).
 *
 * WHY NOT A MAPLIBRE POPUP?
 * MapLibre's built-in Popup component adds DOM overhead and is harder to style
 * with CSS Modules. For a lightweight hover label, a plain positioned div is
 * simpler, faster, and fully under our control.
 *
 * NOTE: pointer-events: none is critical — the tooltip must not capture mouse
 * events or it will interfere with the underlying map interactions.
 */

import { STRINGS } from '../../constants/strings';
import styles from './HoverTooltip.module.css';

interface HoverTooltipProps {
  district: string;
  city: string;
  metricLabel: string;
  metricValue: string;
  /** Mouse X position in container-relative pixels */
  x: number;
  /** Mouse Y position in container-relative pixels */
  y: number;
}

export function HoverTooltip({
  district,
  city,
  metricLabel,
  metricValue,
  x,
  y,
}: HoverTooltipProps) {
  return (
    <div
      className={styles.tooltip}
      style={
        {
          '--tooltip-x': `${x}px`,
          '--tooltip-y': `${y}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <strong className={styles.district}>{district}</strong>
      <span className={styles.city}>{city}</span>
      <span className={styles.metric}>
        {metricLabel}: <strong>{metricValue}</strong>
      </span>
      <span className={styles.prompt}>{STRINGS.tooltip.clickPrompt}</span>
    </div>
  );
}
