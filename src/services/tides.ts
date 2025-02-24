import type { Coordinates, TideInfo } from '../types';
import { getCachedData, setCachedData } from './cache';

const MARINE_API_KEY = import.meta.env.VITE_MARINE_API_KEY;
const MARINE_API_URL = 'https://api.worldweatheronline.com/premium/v1/marine.ashx';

export async function getTideData(coordinates: Coordinates): Promise<{ data: TideInfo | null; raw: any }> {
  if (!MARINE_API_KEY) {
    throw new Error('Marine API key is not configured');
  }

  // Check cache first
  const cachedData = getCachedData<{ data: TideInfo | null; raw: any }>('tide', coordinates);
  if (cachedData) {
    return cachedData;
  }

  try {
    const formattedCoords = `${coordinates.latitude.toFixed(6)},${coordinates.longitude.toFixed(6)}`;
    
    const response = await fetch(
      `${MARINE_API_URL}?key=${MARINE_API_KEY}&q=${formattedCoords}&format=json&tide=yes&tp=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FishingConditionsApp/1.0'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Marine API key');
      }
      if (response.status === 429) {
        throw new Error('Marine API rate limit exceeded');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.[0]?.msg || 
        `Marine service error (${response.status})`
      );
    }

    const rawData = await response.json();

    // Validate response data
    if (!rawData?.data?.weather?.[0]?.tides?.[0]?.tide_data?.length) {
      const result = { data: null, raw: rawData };
      setCachedData('tide', coordinates, result);
      return result;
    }

    // Get today's and tomorrow's tide data
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
    if (error instanceof TypeError || error.name === 'TypeError') {
      throw new Error('Network error - please check your connection');
    }
    throw error;
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