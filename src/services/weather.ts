import type { WeatherData, FishingCondition, TimelinePoint, TideInfo } from '../types';
import { getMoonPhase } from './moon';

export async function fetchWeatherData(lat: number, lon: number) {
  try {
    // Get current weather and forecast in parallel
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(
        `/api/weather/current?lat=${lat}&lon=${lon}`,
        { 
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'FishingConditionsApp/1.0'
          }
        }
      ),
      fetch(
        `/api/weather/forecast?lat=${lat}&lon=${lon}`,
        { 
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'FishingConditionsApp/1.0'
          }
        }
      )
    ]);

    // Handle API errors
    for (const response of [currentResponse, forecastResponse]) {
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Weather service error (${response.status})`);
      }
    }

    // Parse responses
    const [currentData, forecastData] = await Promise.all([
      currentResponse.json(),
      forecastResponse.json()
    ]);

    // Validate response data
    if (!currentData?.main || !forecastData?.list?.length) {
      throw new Error('Invalid weather data received');
    }

    return {
      current: currentData,
      forecast: forecastData
    };
  } catch (error: any) {
    console.error('Weather API error:', error);
    if (error instanceof TypeError || error.name === 'TypeError') {
      throw new Error('Network error - please check your connection');
    }
    throw error;
  }
}

function calculateFishingScore(weather: WeatherData, tideInfo: TideInfo | null): number {
  let score = 70; // Base score

  // Wind conditions (optimal range 5-15 mph)
  if (weather.windSpeed < 5) score += 10;
  else if (weather.windSpeed > 20) score -= 20;
  else if (weather.windSpeed > 15) score -= 10;

  // Temperature impact (optimal range 60-75°F)
  if (weather.temperature >= 60 && weather.temperature <= 75) score += 10;
  else if (weather.temperature < 45 || weather.temperature > 85) score -= 15;
  else score -= 5;

  // Cloud cover impact (40-70% is optimal)
  if (weather.cloudCover >= 40 && weather.cloudCover <= 70) score += 10;
  else if (weather.cloudCover > 90) score -= 5;

  // Precipitation impact
  if (weather.precipitation > 50) score -= 20;
  else if (weather.precipitation > 30) score -= 10;

  // Pressure changes (stable pressure is better)
  if (weather.pressure >= 1010 && weather.pressure <= 1020) score += 5;

  // Tide state impact (if available)
  if (tideInfo) {
    if (tideInfo.state === 'incoming' || tideInfo.state === 'outgoing') score += 10;
    if (tideInfo.height > 0.5 && tideInfo.height < 2) score += 5;
  }

  // Ensure score stays within 0-100 range
  return Math.max(0, Math.min(100, score));
}

function determineCondition(score: number): FishingCondition {
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Okay';
  return 'Poor';
}

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((degrees || 0) % 360) / 45) % 8;
  return directions[index];
}

function generateReasons(weather: WeatherData, tideInfo: TideInfo | null): string[] {
  const reasons: string[] = [];

  // Wind conditions
  if (weather.windSpeed < 5) {
    reasons.push('Light winds under 5 mph - ideal for fishing');
  } else if (weather.windSpeed < 15) {
    reasons.push('Moderate winds - good for surface activity');
  } else {
    reasons.push('Strong winds may affect fishing conditions');
  }

  // Temperature
  if (weather.temperature >= 60 && weather.temperature <= 75) {
    reasons.push('Optimal water temperature for fish activity');
  } else if (weather.temperature < 45) {
    reasons.push('Cold temperatures may reduce fish activity');
  } else if (weather.temperature > 85) {
    reasons.push('Warm temperatures - fish may be deeper in water');
  }

  // Cloud cover
  if (weather.cloudCover >= 40 && weather.cloudCover <= 70) {
    reasons.push('Partial cloud cover providing good visibility');
  } else if (weather.cloudCover > 90) {
    reasons.push('Heavy cloud cover may affect fish feeding');
  }

  // Precipitation
  if (weather.precipitation > 50) {
    reasons.push('High chance of rain may affect water conditions');
  } else if (weather.precipitation < 20) {
    reasons.push('Clear weather conditions');
  }

  // Tide information if available
  if (tideInfo) {
    if (tideInfo.state === 'incoming') {
      reasons.push('Incoming tide bringing food sources');
    } else if (tideInfo.state === 'outgoing') {
      reasons.push('Outgoing tide concentrating fish in deeper areas');
    }
  }

  return reasons;
}

export function generateForecastTimeline(weatherData: any, tideData: TideInfo | null): TimelinePoint[] {
  const points: TimelinePoint[] = [];
  
  try {
    // Validate weather data structure
    if (!weatherData?.current || !weatherData?.forecast?.list) {
      console.error('Invalid weather data structure:', weatherData);
      throw new Error('Invalid weather data format');
    }

    // Process current weather with safe fallbacks
    const currentWeather: WeatherData = {
      windSpeed: weatherData.current.wind?.speed || 0,
      windDirection: getWindDirection(weatherData.current.wind?.deg),
      temperature: weatherData.current.main?.temp || 0,
      precipitation: weatherData.current.rain ? 100 : 0,
      cloudCover: weatherData.current.clouds?.all || 0,
      pressure: weatherData.current.main?.pressure || 1013
    };

    const currentTime = new Date(weatherData.current.dt * 1000);
    const currentMoonPhase = getMoonPhase(currentTime);
    const currentScore = calculateFishingScore(currentWeather, tideData);
    
    points.push({
      timestamp: currentTime,
      score: currentScore,
      condition: determineCondition(currentScore),
      weather: currentWeather,
      tide: tideData,
      moonPhase: currentMoonPhase,
      reasons: generateReasons(currentWeather, tideData)
    });

    // Process forecast data with validation
    weatherData.forecast.list.forEach((item: any) => {
      if (!item?.main || !item?.wind || !item?.clouds) {
        console.warn('Skipping invalid forecast item:', item);
        return;
      }

      const weather: WeatherData = {
        windSpeed: item.wind.speed || 0,
        windDirection: getWindDirection(item.wind.deg),
        temperature: item.main.temp || 0,
        precipitation: (item.pop || 0) * 100,
        cloudCover: item.clouds.all || 0,
        pressure: item.main.pressure || 1013
      };

      const timestamp = new Date(item.dt * 1000);
      const moonPhase = getMoonPhase(timestamp);
      const score = calculateFishingScore(weather, tideData);

      points.push({
        timestamp,
        score,
        condition: determineCondition(score),
        weather,
        tide: tideData,
        moonPhase,
        reasons: generateReasons(weather, tideData)
      });
    });

    return points;
  } catch (error) {
    console.error('Error generating timeline:', error);
    throw new Error('Failed to process weather forecast data');
  }
}