import type { Coordinates, TideInfo } from '../types';
import { getCachedData, setCachedData } from './cache';

export async function getTideData(coordinates: Coordinates): Promise<{ data: TideInfo | null; raw: any }> {
  // Check cache first
  const cachedData = getCachedData<{ data: TideInfo | null; raw: any }>('tide', coordinates);
  if (cachedData) {
    return cachedData;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(
      `/api/marine?lat=${coordinates.latitude}&lon=${coordinates.longitude}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FishingConditionsApp/1.0'
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Marine service error');
    }

    const rawData = await response.json();

    // Validate response data
    if (!rawData?.data?.weather?.[0]?.tides?.[0]?.tide_data?.length) {
      const result = { data: null, raw: rawData };
      setCachedData('tide', coordinates, result);
      return result;
    }

    // Process tide data from all available weather days
    const todayTides = rawData.data.weather[0]?.tides?.[0]?.tide_data || [];
    const tomorrowTides = rawData.data.weather[1]?.tides?.[0]?.tide_data || [];
    
    // Combine and process tide data
    const allTides = [...todayTides, ...tomorrowTides]
      .map((tide: any) => ({
        time: new Date(tide.tideDateTime),
        height: parseFloat(tide.tideHeight_mt),
        type: tide.tide_type.toUpperCase()
      }))
      .filter((tide: any) => !isNaN(tide.height) && tide.height > 0)
      .sort((a: any, b: any) => a.time.getTime() - b.time.getTime());

    if (allTides.length < 2) {
      const result = { data: null, raw: rawData };
      setCachedData('tide', coordinates, result);
      return result;
    }

    const now = new Date();
    
    // Find current tide state and height
    const { height, state } = calculateCurrentTide(allTides, now);
    
    // Find next high and low tides
    const nextHigh = findNextTide(allTides, 'HIGH', now);
    const nextLow = findNextTide(allTides, 'LOW', now);

    const result = {
      data: {
        height,
        state,
        nextHigh: nextHigh?.time,
        nextLow: nextLow?.time,
        rawData
      },
      raw: rawData
    };

    // Cache the successful response
    setCachedData('tide', coordinates, result);

    return result;
  } catch (error: any) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      console.warn('Marine API request timed out');
      return { data: null, raw: { error: 'Request timed out' } };
    }
    
    if (error instanceof TypeError || error.name === 'TypeError') {
      console.warn('Marine API network error:', error);
      return { data: null, raw: { error: 'Network error' } };
    }

    console.error('Marine API error:', error);
    return { data: null, raw: { error: error.message } };
  }
}

function findNextTide(tideData: any[], type: string, now: Date) {
  return tideData.find(tide => 
    tide.type === type && tide.time > now
  );
}

function calculateCurrentTide(tideData: any[], currentTime: Date) {
  // Find the surrounding tide points
  let prevTide = null;
  let nextTide = null;

  for (let i = 0; i < tideData.length - 1; i++) {
    if (tideData[i].time <= currentTime && tideData[i + 1].time > currentTime) {
      prevTide = tideData[i];
      nextTide = tideData[i + 1];
      break;
    }
  }

  // If we're before the first tide or after the last tide
  if (!prevTide || !nextTide) {
    if (currentTime < tideData[0].time) {
      // Before first tide, use last tide from previous day
      const lastTideTime = new Date(tideData[0].time);
      lastTideTime.setDate(lastTideTime.getDate() - 1);
      
      prevTide = {
        ...tideData[tideData.length - 1],
        time: lastTideTime
      };
      nextTide = tideData[0];
    } else {
      // After last tide, use first tide of next day
      const nextTideTime = new Date(tideData[0].time);
      nextTideTime.setDate(nextTideTime.getDate() + 1);
      
      prevTide = tideData[tideData.length - 1];
      nextTide = {
        ...tideData[0],
        time: nextTideTime
      };
    }
  }

  // Calculate progress through the tide cycle
  const totalDuration = nextTide.time.getTime() - prevTide.time.getTime();
  const elapsedTime = currentTime.getTime() - prevTide.time.getTime();
  const progress = Math.max(0, Math.min(1, elapsedTime / totalDuration));

  // Calculate current height using cubic interpolation
  const height = interpolateTideHeight(prevTide.height, nextTide.height, progress);

  // Determine tide state
  const state = determineTideState(prevTide, nextTide, progress);

  return {
    height: Number(height.toFixed(2)),
    state
  };
}

function interpolateTideHeight(h1: number, h2: number, progress: number): number {
  // Use cubic interpolation for smoother transition
  const p = progress;
  const p2 = p * p;
  const p3 = p2 * p;
  
  // Cubic formula: ax³ + bx² + cx + d
  // Where coefficients are chosen to create a smooth S-curve
  return h1 + (h2 - h1) * (-2*p3 + 3*p2);
}

function determineTideState(prevTide: any, nextTide: any, progress: number): string {
  // If the tides are different types, use that to determine state
  if (prevTide.type !== nextTide.type) {
    if (prevTide.type === 'HIGH' && nextTide.type === 'LOW') {
      return 'outgoing';
    }
    if (prevTide.type === 'LOW' && nextTide.type === 'HIGH') {
      return 'incoming';
    }
  }
  
  // If both points are the same type or undefined, use height difference
  const heightDiff = nextTide.height - prevTide.height;
  
  // Add hysteresis to prevent rapid state changes near inflection points
  const threshold = 0.1; // 10cm threshold
  
  if (Math.abs(heightDiff) < threshold) {
    // Near peak/trough, use progress to determine state
    return progress < 0.5 ? 'incoming' : 'outgoing';
  }
  
  return heightDiff > 0 ? 'incoming' : 'outgoing';
}