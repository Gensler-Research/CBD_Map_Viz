/**
 * components/SidePanel/PersonaSplit.tsx
 *
 * Donut pie chart showing the four visitor persona percentages for a selected CBD,
 * plus a callout when the Enthusiast % is notably above/below global average.
 *
 * WHY A DONUT CHART?
 * The four personas sum to ~100% (small rounding differences may exist).
 * A donut chart makes the proportions immediately visible as parts of a whole.
 * The hollow centre keeps it feeling light at small sizes.
 *
 * PERSONA ORDER:
 * Listed from most to least "engaged" so the arc reads clockwise as a
 * spectrum from committed to reluctant users.
 *   Enthusiast → Special Event → Errand Runner → Reluctant Visitor
 *
 * SVG APPROACH (no charting library):
 * Four SVG <path> elements, each drawn as a donut slice using arc commands.
 * A small angular gap between slices provides visual separation.
 * CSS custom properties supply the fill colours — same tokens as globals.css.
 */

import type { CBDProperties } from '../../types/cbd';
import { STRINGS } from '../../constants/strings';
import styles from './PersonaSplit.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonaConfig {
  key: keyof Pick<
    CBDProperties,
    | 'enthusiastPct'
    | 'specialEventVisitorPct'
    | 'errandRunnerPct'
    | 'reluctantVisitorPct'
  >;
  label: string;
  colorVar: string; // CSS custom property name from globals.css
}

// ─── Persona definitions ──────────────────────────────────────────────────────

const PERSONAS: PersonaConfig[] = [
  {
    key: 'enthusiastPct',
    label: STRINGS.personas.enthusiast,
    colorVar: '--color-persona-enthusiast',
  },
  {
    key: 'specialEventVisitorPct',
    label: STRINGS.personas.specialEventVisitor,
    colorVar: '--color-persona-special-event',
  },
  {
    key: 'errandRunnerPct',
    label: STRINGS.personas.errandRunner,
    colorVar: '--color-persona-errand-runner',
  },
  {
    key: 'reluctantVisitorPct',
    label: STRINGS.personas.reluctantVisitor,
    colorVar: '--color-persona-reluctant',
  },
];

// ─── SVG helpers ──────────────────────────────────────────────────────────────

/**
 * Converts a polar angle (in degrees, 0 = 12 o'clock, clockwise) to an
 * (x, y) Cartesian coordinate on a circle centred at (cx, cy) with radius r.
 */
function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  // Subtract 90° so 0° starts at the top (12 o'clock) instead of the right
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * Builds the SVG `d` attribute for a single donut slice between two angles.
 *
 * The path traces:
 *   outer arc (start → end, clockwise)
 *   line inward to inner arc end
 *   inner arc (end → start, counter-clockwise)
 *   close
 */
function donutSlicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  // SVG arc flag: use the large arc when the slice spans more than 180°
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

// ─── Donut chart component ────────────────────────────────────────────────────

// Chart dimensions (SVG user units)
const SIZE = 140;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = SIZE / 2 - 6;
const INNER_R = OUTER_R * 0.54; // controls donut hole size
const GAP_DEG = 2.5; // angular gap between each slice

interface DonutChartProps {
  cbd: CBDProperties;
}

function DonutChart({ cbd }: DonutChartProps) {
  // Sum all persona values so we can express each as a fraction of the total
  // (handles minor rounding differences where values don't add to exactly 100)
  const total = PERSONAS.reduce((sum, p) => sum + cbd[p.key], 0);

  // Compute start/end angles for each slice, inserting a small gap between them
  let currentAngle = 0;
  const slices = PERSONAS.map((persona) => {
    const pct = cbd[persona.key];
    const fullSweep = (pct / total) * 360;
    const startAngle = currentAngle + GAP_DEG / 2;
    const endAngle = currentAngle + fullSweep - GAP_DEG / 2;
    currentAngle += fullSweep;
    return { ...persona, pct, startAngle, endAngle };
  });

  return (
    <svg
      className={styles.pieChart}
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true" // decorative; the legend below provides accessible text
    >
      {slices.map((slice) => (
        <path
          key={slice.key}
          d={donutSlicePath(CX, CY, OUTER_R, INNER_R, slice.startAngle, slice.endAngle)}
          // fill via inline style so CSS custom properties resolve correctly in SVG
          style={{ fill: `var(${slice.colorVar})` }}
        >
          <title>{`${slice.label}: ${slice.pct.toFixed(1)}%`}</title>
        </path>
      ))}
    </svg>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface PersonaSplitProps {
  cbd: CBDProperties;
  /** Global average Enthusiast % — used for the callout comparison */
  globalAvgEnthusiast: number;
}

export function PersonaSplit({ cbd, globalAvgEnthusiast }: PersonaSplitProps) {
  // Callout: flag if this CBD's Enthusiast % differs meaningfully from average
  const enthusiastDiff = cbd.enthusiastPct - globalAvgEnthusiast;
  const CALLOUT_THRESHOLD = 3; // percentage points

  let calloutText: string | null = null;
  let calloutIcon: string | null = null;
  if (Math.abs(enthusiastDiff) >= CALLOUT_THRESHOLD) {
    const direction = enthusiastDiff > 0 ? 'more' : 'fewer';
    calloutText = `${Math.abs(enthusiastDiff).toFixed(1)}% ${direction} Enthusiasts than the global average`;
    calloutIcon = enthusiastDiff > 0 ? '↑' : '↓';
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{STRINGS.sidePanel.personaTitle}</h3>
      <p className={styles.subtitle}>{STRINGS.sidePanel.personaSubtitle}</p>

      {/* Donut chart */}
      <DonutChart cbd={cbd} />

      {/* Legend */}
      <div className={styles.legend} role="list" aria-label="Visitor persona breakdown">
        {PERSONAS.map((persona) => {
          const pct = cbd[persona.key];
          return (
            <div key={persona.key} className={styles.legendItem} role="listitem">
              <span
                className={styles.legendDot}
                style={
                  {
                    '--dot-color': `var(${persona.colorVar})`,
                  } as React.CSSProperties
                }
              />
              <span className={styles.legendLabel}>{persona.label}</span>
              <span className={styles.legendPct}>{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      {/* Callout — only shown when Enthusiast % differs significantly */}
      {calloutText && (
        <p className={styles.callout}>
          <span className={styles.calloutIcon}>{calloutIcon}</span>
          {calloutText}
        </p>
      )}
    </div>
  );
}
