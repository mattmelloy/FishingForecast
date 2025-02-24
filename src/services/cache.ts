import type { LocationInfo } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  coordinates: string;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export function getCachedData<T>(key: string, coordinates: LocationInfo['coordinates']): T | null {
  try {
    const coordString = `${coordinates.latitude},${coordinates.longitude}`;
    const cacheKey = `fishing-forecast-${key}-${coordString}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired or coordinates don't match
    if (now - entry.timestamp > CACHE_DURATION || entry.coordinates !== coordString) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

export function setCachedData<T>(
  key: string,
  coordinates: LocationInfo['coordinates'],
  data: T
): void {
  try {
    const coordString = `${coordinates.latitude},${coordinates.longitude}`;
    const cacheKey = `fishing-forecast-${key}-${coordString}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      coordinates: coordString
    };

    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}