/**
 * types/global.d.ts
 *
 * Ambient module declarations — tells TypeScript how to type imports for
 * file types it doesn't understand by default.
 *
 * WHY THIS IS NEEDED:
 * TypeScript knows how to import .ts/.tsx/.js files and (with resolveJsonModule)
 * .json files. But .geojson is not a recognised extension.
 *
 * This declaration says: "whenever you see `import x from '*.geojson'`,
 * treat x as an unknown object". We then cast it to our typed structure in
 * joinData.ts using `as unknown as CBDFeatureCollection`.
 *
 * If we ever switch to fetching the GeoJSON at runtime instead of bundling it,
 * we remove this file and the import in joinData.ts — everything else stays the same.
 */

declare module '*.geojson' {
  const value: unknown;
  export default value;
}
