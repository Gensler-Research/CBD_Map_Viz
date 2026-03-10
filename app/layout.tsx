/**
 * app/layout.tsx
 *
 * Root layout — wraps every page in the application.
 *
 * In Next.js App Router, layout.tsx is a Server Component by default (no
 * 'use client' needed). It renders once and wraps child pages.
 *
 * Key things this file does:
 * 1. Sets HTML metadata (title, description)
 * 2. Imports global CSS (only allowed in layout or page files in App Router)
 * 3. Imports the MapLibre CSS — required for the map controls and canvas to
 *    render correctly. Must be imported globally, not inside a component.
 */

import type { Metadata } from 'next';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';

export const metadata: Metadata = {
  title: 'Gensler City Pulse 2026 — CBD Map',
  description:
    'Interactive map exploring CBD research findings across 130 business districts in 75 global cities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/*
        We removed the Geist font import. Per CLAUDE.md, the font is the
        system font stack defined in globals.css (--font-sans).
        No className is needed on body — globals.css sets font-family directly.
      */}
      <body>{children}</body>
    </html>
  );
}
