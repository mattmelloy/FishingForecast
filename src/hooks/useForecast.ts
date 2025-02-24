import useSWR from 'swr';
import { fetchWeatherData, generateForecastTimeline } from '../services/weather';
import { getTideData } from '../services/tides';
import type { LocationInfo, FishingForecast, TimelinePoint } from '../types';

async function fetchForecastData(locationInfo: LocationInfo) {
  try {
    const { coordinates } = locationInfo;
    
    // Fetch weather and tide data in parallel
    const [weatherResult, tideResult] = await Promise.all([
      fetchWeatherData(coordinates.latitude, coordinates.longitude).catch(error => {
        console.error('Weather API error:', error);
        throw new Error(error.message || 'Failed to fetch weather data');
      }),
      getTideData(coordinates).catch(error => {
        // Log but don't throw tide errors - tide data is optional
        console.warn('Tide API error:', error);
        return { data: null, raw: null };
      })
    ]);

    // Generate timeline with weather data and tide data (if available)
    const timeline = generateForecastTimeline(weatherResult, tideResult.data);

    if (!timeline || !timeline.length) {
      throw new Error('Failed to generate forecast timeline');
    }

    return {
      current: timeline[0],
      timeline: { points: timeline },
      rawData: {
        weather: weatherResult,
        tide: tideResult.raw
      }
    };
  } catch (error: any) {
    // Ensure we always return a clean error message
    const message = error.message || 'An unexpected error occurred';
    throw new Error(message);
  }
}

export function useForecast(locationInfo: LocationInfo | null) {
  const { data, error, isLoading } = useSWR(
    locationInfo ? ['forecast', locationInfo] : null,
    ([, info]) => fetchForecastData(info),
    {
      refreshInterval: 1800000, // Refresh every 30 minutes
      revalidateOnFocus: false,
      shouldRetryOnError: false, // Disable automatic retries for API errors
      errorRetryCount: 1, // Only retry once for network issues
      dedupingInterval: 60000, // Dedupe requests within 1 minute
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry on API key errors
        if (error.message.includes('API key')) return;
        
        // Only retry once for other errors
        if (retryCount >= 1) return;
        
        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
      }
    }
  );

  return {
    forecast: data?.current,
    timeline: data?.timeline,
    rawData: data?.rawData,
    isLoading,
    error: error?.message || null
  };
}