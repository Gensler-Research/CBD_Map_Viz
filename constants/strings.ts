/**
 * constants/strings.ts
 *
 * Every piece of user-facing text in one place.
 *
 * WHY THIS FILE EXISTS:
 * Hardcoding text inside components makes it hard to find and update copy.
 * By importing from here, a content editor can update every label, heading,
 * and aria-label without touching component logic. It also makes future
 * internationalisation (i18n) straightforward — swap this file per locale.
 */

export const STRINGS = {
  map: {
    metricSwitcherLabel: 'Size circles by',
    loadingMessage: 'Loading CBD data…',
    errorMessage: 'Could not load map data. Please refresh.',
    globalViewButton: '← Return to global view',
    globalViewAriaLabel: 'Return to global map view',
  },
  sidePanel: {
    closeButton: 'Close',
    closeAriaLabel: 'Close detail panel',
    returnToGlobalView: '← Return to global view',
    returnToGlobalViewAriaLabel: 'Close panel and return to global map view',
    globalAvgLabel: 'Global average',
    percentileLabel: 'Globally',
    personaTitle: 'Visitor Personas',
    personaSubtitle: 'How residents in this CBD engage with downtown',
  },
  personas: {
    enthusiast: 'Enthusiast',
    reluctantVisitor: 'Reluctant Visitor',
    errandRunner: 'Errand Runner',
    specialEventVisitor: 'Special Event Visitor',
  },
  tooltip: {
    clickPrompt: 'Click to explore',
  },
} as const;

// "as const" makes every string a readonly literal type.
// This prevents accidental mutation and improves autocomplete.
