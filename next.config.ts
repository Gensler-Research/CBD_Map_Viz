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

// When running in GitHub Actions, the site is served from /CBD_Map_Viz.
// Locally (dev or build) there's no subdirectory, so basePath stays empty.
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  turbopack: {},
  devIndicators: false,

  // Static export — required for GitHub Pages (no Node server available)
  output: 'export',

  // Only prefix asset paths when deploying — keeps localhost:3000 working normally
  basePath: isGitHubActions ? '/CBD_Map_Viz' : '',

  // Next.js image optimisation requires a server; disable for static export.
  images: { unoptimized: true },
};

export default nextConfig;
