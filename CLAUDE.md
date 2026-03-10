# CLAUDE.md — Gensler City Pulse 2026: Interactive CBD Map

## Project Overview

Interactive data visualisation map for the Gensler City Pulse 2026 report. 130 CBDs (Central Business Districts) across 75 global cities. Audience: real estate developers and city leaders. Should feel authoritative and data-rich.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- MapLibre GL JS via `react-map-gl` v8
- CSS Modules (co-located with components)
- No backend — all data is static files loaded at runtime

## Critical Data Facts

- GeoJSON is at `data/business_districts_enriched.geojson` — all metrics already embedded, no separate metrics.json
- CBD name field is `district` (not `name`)
- No `country` field in GeoJSON — only `city` and `region`
- Multiple CBDs per city (e.g. New York, Tokyo, London, Manila) — treat each independently
- Stickiness Score ranges 0–69.93. Cairo highest (69.93), Tokyo lowest (42.03)

## Component Architecture

```
app/page.tsx (Server)  →  components/MapLoader.tsx ('use client', dynamic ssr:false)  →  components/MapApp.tsx ('use client')
```

- `page.tsx` reads the GeoJSON file server-side and passes data as a prop
- `MapApp` wraps everything in `MapProvider` from `lib/MapContext.tsx`
- All shared state in context: `selectedCBD`, `activeMetric`, `globalAverages`, `allMetricValues`, `flyToGlobalRef`, `resetToGlobal`

## Development Conventions

- **CSS Modules only** — no inline styles except dynamic values via CSS custom properties (`style={{ '--foo': value }}`)
- **All colours/typography** as CSS custom properties in `app/globals.css` — never hardcoded in component files
- **Named exports** for all components
- **No `any` types** — use `maplibre-gl` types for all map event objects
- **All MapLibre source/layer IDs** defined as constants in `lib/mapConfig.ts`, never inline strings
- **All UI copy** in `constants/strings.ts` — never hardcode strings in components
- **GeoJSON dataset** must be memoised (only recomputed if source data changes)
- **Global averages** computed once on load in context, not per render

## Style Guide (Placeholder — awaiting Gensler brand guide)

- Accent colour: `#C8102E` (Gensler red)
- Background: `#ffffff`, Text: `#1a1a1a`
- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- When brand guide is received: update tokens in `app/globals.css` only — components must not need changes

## Key Metrics (for writing accurate copy)

| Field | Label | Description |
|---|---|---|
| `stickinessScore` | Stickiness Score | Visit frequency + duration, scaled 0–100. Default map sizing metric. |
| `cbdGreatExperience` | Great Experience | % of residents who say their CBD offers a great experience. |
| `enthusiastPct` | Enthusiasts | % who visit frequently and stay for extended periods. |
| `vibrantPct` | Vibrancy | % who rate their CBD as vibrant. |

Persona split (global averages): Enthusiasts 11%, Special Event Visitors 19%, Errand Runners 27%, Reluctant Visitors 42%. Report goal: convert Reluctant Visitors into Enthusiasts.

The core tension in the report: ~73% of residents say their CBD is great, but fewer than half visit weekly. Cities with high perception but low stickiness are the key targets.

## Map Interaction Model

- **Low zoom** (< city threshold): one circle per city (averaged metrics). Click → fly to city.
- **High zoom** (≥ city threshold): individual CBD circles. Click → select CBD, open side panel.
- **Top-right UI**: "Zoom to region" button panel at global zoom; replaced by "← Return to global view" when zoomed in.
- Cross-component camera reset: `flyToGlobalRef` (ref) + `resetToGlobal` (callback) in MapContext — lets SidePanel trigger map reset without holding a map reference.

## Mobile

- Breakpoint: 768px
- Below 768px: SidePanel becomes a bottom sheet (slides up)
- Hit targets minimum 44×44px — use transparent MapLibre hit-area layers
