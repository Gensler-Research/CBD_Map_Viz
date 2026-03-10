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

  // basePath is set via NEXT_PUBLIC_BASE_PATH env var in the GitHub Actions
  // workflow. Without it, local dev works at localhost:3000 with no prefix.
  // On GitHub Pages the site is served at /<repo>/, so the basePath must
  // match the repo name so _next/ asset paths resolve correctly.
  ...(process.env.NEXT_PUBLIC_BASE_PATH
    ? { basePath: process.env.NEXT_PUBLIC_BASE_PATH }
    : {}),

  // Next.js image optimisation requires a server; disable for static export.
  images: { unoptimized: true },
};

export default nextConfig;
