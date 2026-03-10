/**
 * lib/MapContext.tsx
 *
 * React Context that holds all shared state for the map application.
 *
 * WHY REACT CONTEXT?
 * Many components need the same data: the selected CBD, the active metric,
 * global averages. Without context, you'd have to "prop-drill" — pass those
 * values as props through every layer of components, even ones that don't use
 * them. Context lets any component subscribe directly to the state it needs.
 *
 * HOW IT WORKS:
 * 1. MapProvider wraps the whole app. It holds the state and computes derived
 *    data (averages, value arrays) using useMemo so they're only recalculated
 *    when the source data changes.
 * 2. useMapContext is a custom hook that any child component calls to read or
 *    update the shared state. It also throws a helpful error if you accidentally
 *    use it outside of a MapProvider.
 *
 * 'use client' is required because this file uses React hooks (useState,
 * useMemo, createContext). In Next.js App Router, hooks can only run in the
 * browser — not during server-side rendering.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';

import type {
  CBDProperties,
  CBDFeatureCollection,
  CityAggFeatureCollection,
  MetricKey,
  GlobalAverages,
} from '../types/cbd';
import { METRICS } from './metricConfig';
import {
  computeGlobalAverages,
  computeCityAggregates,
  getAllMetricValues,
} from './joinData';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

/**
 * Everything components can read from or write to via useMapContext().
 */
interface MapContextValue {
  /** The full GeoJSON dataset — passed to MapLibre as a data source */
  geojsonData: CBDFeatureCollection;

  /** One aggregated feature per city (averaged metrics + centroid coordinate) */
  cityData: CityAggFeatureCollection;

  /** The CBD the user has clicked on, or null if none is selected */
  selectedCBD: CBDProperties | null;
  setSelectedCBD: (cbd: CBDProperties | null) => void;

  /** Which metric is currently sizing the circles on the map */
  activeMetric: MetricKey;
  setActiveMetric: (key: MetricKey) => void;

  /** Mean value for each switchable metric across the full dataset */
  globalAverages: GlobalAverages;

  /**
   * All individual values for each metric — used by MetricCard to compute
   * where a selected CBD ranks globally (percentile).
   */
  allMetricValues: Record<MetricKey, number[]>;

  /**
   * MapView registers its flyTo-global-view function here so that other
   * components (e.g. SidePanel) can trigger a camera reset without needing
   * direct access to the MapLibre map instance.
   *
   * It's a MutableRefObject so MapView can assign to it imperatively in a
   * useEffect without causing a re-render of the whole tree.
   */
  flyToGlobalRef: { current: (() => void) | null };

  /**
   * Closes the side panel (clears selectedCBD) and flies the camera back to
   * the initial global view. Any component can call this — it works by
   * combining setSelectedCBD(null) with whatever function MapView registered
   * in flyToGlobalRef.
   */
  resetToGlobal: () => void;
}

// ---------------------------------------------------------------------------
// Context creation
// ---------------------------------------------------------------------------

/**
 * createContext needs a default value. We pass null and check for it in
 * useMapContext — this is the standard pattern when the context is always
 * provided by a wrapper component.
 */
const MapContext = createContext<MapContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface MapProviderProps {
  children: ReactNode;
  data: CBDFeatureCollection;
}

export function MapProvider({ children, data }: MapProviderProps) {
  // React state: when these change, components that use them re-render
  const [selectedCBD, setSelectedCBD] = useState<CBDProperties | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('stickinessScore');

  /**
   * useMemo caches the result of computeGlobalAverages(data).
   * The second argument [data] is the "dependency array" — React only
   * recomputes this if `data` changes. Since data is static (loaded once),
   * this effectively runs once and is cached for the lifetime of the app.
   */
  const globalAverages = useMemo(() => computeGlobalAverages(data), [data]);

  /** City aggregates — grouped and averaged once from the full dataset */
  const cityData = useMemo(() => computeCityAggregates(data), [data]);

  /**
   * Similarly, pre-compute all individual metric value arrays once.
   * Components use these arrays to calculate percentile rankings without
   * iterating over the full dataset on every render.
   */
  const allMetricValues = useMemo(() => {
    const result = {} as Record<MetricKey, number[]>;
    for (const metric of METRICS) {
      result[metric.key] = getAllMetricValues(data, metric.key);
    }
    return result;
  }, [data]);

  /**
   * A mutable ref that MapView writes its flyTo-global function into.
   * Using a ref (not state) means updating it never triggers a re-render.
   */
  const flyToGlobalRef = useRef<(() => void) | null>(null);

  /**
   * Public function that any component can call to close the panel and
   * return the camera to the initial global view.
   */
  const resetToGlobal = useCallback(() => {
    setSelectedCBD(null);
    flyToGlobalRef.current?.();
  }, [setSelectedCBD]);

  const value: MapContextValue = {
    geojsonData: data,
    cityData,
    selectedCBD,
    setSelectedCBD,
    activeMetric,
    setActiveMetric,
    globalAverages,
    allMetricValues,
    flyToGlobalRef,
    resetToGlobal,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

// ---------------------------------------------------------------------------
// Custom hook
// ---------------------------------------------------------------------------

/**
 * useMapContext() — call this in any component to access shared state.
 *
 * The guard clause (if !ctx) gives a clear error message in development
 * if you forget to wrap your component tree with <MapProvider>.
 */
export function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error('useMapContext must be used within a <MapProvider>');
  }
  return ctx;
}
