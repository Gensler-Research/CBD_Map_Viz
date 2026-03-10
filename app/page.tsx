/**
 * app/page.tsx
 *
 * Root page — a Server Component that loads data and hands off to the client.
 *
 * ARCHITECTURE SUMMARY:
 *
 *   page.tsx (Server Component)
 *     ↓ reads file with fs.readFileSync — no bundler involved
 *     ↓ passes data as a serialised prop
 *   MapLoader (Client Component)
 *     ↓ uses next/dynamic with ssr:false — required to be in a Client Component
 *   MapApp (Client Component, lazily loaded)
 *     ↓ receives data, sets up React Context, renders the map
 *
 * WHY readFileSync HERE:
 * We need the GeoJSON data. Importing it as a JS module (import x from '*.geojson')
 * fails with Turbopack because it doesn't recognise that file extension.
 * Using readFileSync on the server bypasses the bundler entirely — the file is
 * read directly from disk at request time (or statically at build time).
 *
 * WHY NOT dynamic() WITH ssr:false DIRECTLY HERE:
 * Next.js 16 / Turbopack requires `ssr: false` to be used inside a Client
 * Component, not a Server Component. MapLoader ('use client') owns that call.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { CBDFeatureCollection } from '../types/cbd';
import { parseGeoJSON } from '../lib/joinData';
import { MapLoader } from '../components/MapLoader';

// Read the GeoJSON file from disk on the server.
// process.cwd() returns the project root — the same directory as next.config.ts.
const rawGeoJSON = readFileSync(
  join(process.cwd(), 'data', 'business_districts_enriched.geojson'),
  'utf-8',
);
const geojsonData: CBDFeatureCollection = parseGeoJSON(rawGeoJSON);

export default function Page() {
  // MapLoader is a Client Component — it owns the dynamic import.
  // The data prop is serialised by Next.js and sent to the client in the
  // initial HTML payload (RSC protocol).
  return <MapLoader data={geojsonData} />;
}
