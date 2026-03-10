/**
 * components/Map/RegionButtons.tsx
 *
 * A compact panel of "Zoom to region" buttons shown in the top-right corner
 * of the map when the user is at the global view. Clicking any button flies
 * the camera to that region and the panel disappears (the parent hides it
 * based on zoom level).
 */

'use client';

import { CONTINENTS } from '../../lib/mapConfig';
import styles from './RegionButtons.module.css';

interface RegionButtonsProps {
  onRegionClick: (center: [number, number], flyToZoom: number) => void;
}

export function RegionButtons({ onRegionClick }: RegionButtonsProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.heading}>Zoom to region</p>
      <ul className={styles.list}>
        {CONTINENTS.map((continent) => (
          <li key={continent.id}>
            <button
              className={styles.button}
              onClick={() => onRegionClick(continent.center, continent.flyToZoom)}
              aria-label={`Zoom to ${continent.name}`}
            >
              {continent.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
