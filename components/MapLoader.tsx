/**
 * components/MapLoader.tsx
 *
 * Client Component wrapper that owns the dynamic import of MapApp.
 *
 * WHY THIS FILE EXISTS:
 * In Next.js 16 with Turbopack, `next/dynamic` with `{ ssr: false }` must be
 * called from inside a Client Component — it is not allowed in Server Components.
 *
 * The data flow is:
 *   page.tsx (Server)  ──reads file──▶  MapLoader (Client)  ──dynamic──▶  MapApp
 *
 * page.tsx reads the GeoJSON with readFileSync (server-side, no bundler needed)
 * and passes the parsed data here as a prop. MapLoader then dynamically imports
 * MapApp with ssr: false so MapLibre (WebGL) never runs on the server.
 *
 * Next.js serialises the `data` prop across the server/client boundary as part
 * of the RSC (React Server Component) protocol — no extra fetch required.
 */

'use client';

import dynamic from 'next/dynamic';
import type { CBDFeatureCollection } from '../types/cbd';

/**
 * MapApp is loaded dynamically with ssr: false.
 * "Dynamic" here means the JS bundle for MapApp is loaded separately (code
 * splitting) — it doesn't load until this component mounts in the browser.
 * ssr: false means Next.js will not pre-render MapApp on the server at all,
 * which is required because MapLibre GL calls browser-only APIs on import.
 */
const MapApp = dynamic(
  () => import('./MapApp').then((mod) => mod.MapApp),
  { ssr: false },
);

interface MapLoaderProps {
  data: CBDFeatureCollection;
}

export function MapLoader({ data }: MapLoaderProps) {
  // Simply render MapApp with the data that was loaded server-side.
  // MapApp won't render until the browser has downloaded its bundle.
  return <MapApp data={data} />;
}
