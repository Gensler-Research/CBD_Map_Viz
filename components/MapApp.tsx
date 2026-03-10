/**
 * components/MapApp.tsx
 *
 * The root client component for the entire application.
 *
 * WHY THIS EXISTS (and why it's separate from page.tsx):
 * In Next.js App Router, page.tsx is a Server Component by default. Server
 * Components run on the server (or at build time) and cannot use React hooks
 * or browser APIs.
 *
 * MapLibre needs WebGL — a browser-only API — so it must run client-side.
 * The pattern we use is:
 *   page.tsx (Server Component) → dynamic import with ssr:false → MapApp
 *
 * The dynamic import with { ssr: false } tells Next.js: "don't try to render
 * this on the server at all". This prevents the WebGL/window errors that would
 * otherwise crash the build.
 *
 * DATA FLOW:
 * The GeoJSON is loaded server-side in page.tsx (via readFileSync) and passed
 * here as a typed prop. Next.js serialises it across the server/client boundary
 * automatically — the data travels in the initial HTML payload, so no extra
 * fetch is needed on the client.
 *
 * WHAT THIS COMPONENT DOES:
 * 1. Receives the GeoJSON data as a prop (already loaded and parsed)
 * 2. Wraps the app in MapProvider (sets up React Context with the data)
 * 3. Renders the layout: MapView (left, flexible width) + SidePanel (right, fixed)
 */

'use client';

import type { CBDFeatureCollection } from '../types/cbd';
import { MapProvider } from '../lib/MapContext';
import { MapView } from './Map/MapView';
import { SidePanel } from './SidePanel/SidePanel';
import styles from './MapApp.module.css';

interface MapAppProps {
  data: CBDFeatureCollection;
}

export function MapApp({ data }: MapAppProps) {
  return (
    /*
     * MapProvider makes the data and shared state available to all descendants
     * via React Context. Any component inside this tree can call useMapContext()
     * to access selectedCBD, activeMetric, globalAverages, etc.
     */
    <MapProvider data={data}>
      <div className={styles.layout}>
        {/*
          MapView grows to fill all available horizontal space (flex: 1).
          When SidePanel opens and expands its width, MapView shrinks
          automatically — no JavaScript needed.
        */}
        <MapView />

        {/*
          SidePanel starts at width 0 and animates to --panel-width when a CBD
          is selected. It's always in the DOM so the CSS transition works.
        */}
        <SidePanel />
      </div>
    </MapProvider>
  );
}
