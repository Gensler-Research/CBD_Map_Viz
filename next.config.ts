/**
 * next.config.ts
 *
 * Next.js 16 configuration.
 *
 * As of Next.js 16, Turbopack is the default bundler for both dev and build.
 * We add an explicit `turbopack: {}` to silence the "webpack config without
 * turbopack config" warning. The empty object tells Next.js we've acknowledged
 * the switch and are happy with Turbopack defaults.
 *
 * NOTE: We do not import the .geojson file as a module — it is read server-side
 * with `fs.readFileSync` in app/page.tsx, which bypasses the bundler entirely.
 * No custom loader rules are needed.
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},
  devIndicators: false,

  // Static export — required for GitHub Pages (no Node server available)
  output: 'export',

  // The repo lives at github.com/Gensler-Research/CBD_Map_Viz so
  // GitHub Pages serves it at /CBD_Map_Viz — all asset paths must be prefixed.
  basePath: '/CBD_Map_Viz',

  // Next.js image optimisation requires a server; disable for static export.
  images: { unoptimized: true },
};

export default nextConfig;
