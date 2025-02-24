import React from 'react';
import type { WeatherData, TideInfo, MoonPhase } from '../types';
import { useSettings } from '../context/SettingsContext';

interface ScoreInfoProps {
  weather: WeatherData;
  tide?: TideInfo;
  moonPhase?: MoonPhase;
  onClose: () => void;
}

export function ScoreInfo({ weather, tide, moonPhase, onClose }: ScoreInfoProps) {
  const { convertTemperature, convertWindSpeed } = useSettings();

  const scoreFactors = [
    {
      category: 'Wind Speed',
      condition: weather.windSpeed < 5 
        ? { impact: '+10', reason: 'Light winds under 5 mph - ideal for fishing' }
        : weather.windSpeed > 20
        ? { impact: '-20', reason: 'Strong winds over 20 mph' }
        : weather.windSpeed > 15
        ? { impact: '-10', reason: 'Moderate-high winds 15-20 mph' }
        : { impact: '0', reason: 'Moderate winds 5-15 mph' },
      current: convertWindSpeed(weather.windSpeed)
    },
    {
      category: 'Temperature',
      condition: weather.temperature >= 60 && weather.temperature <= 75
        ? { impact: '+10', reason: 'Optimal temperature range 60-75°F' }
        : weather.temperature < 45 || weather.temperature > 85
        ? { impact: '-15', reason: 'Temperature outside optimal range' }
        : { impact: '-5', reason: 'Temperature slightly outside optimal range' },
      current: convertTemperature(weather.temperature)
    },
    {
      category: 'Cloud Cover',
      condition: weather.cloudCover >= 40 && weather.cloudCover <= 70
        ? { impact: '+10', reason: 'Optimal cloud cover 40-70%' }
        : weather.cloudCover > 90
        ? { impact: '-5', reason: 'Heavy cloud cover' }
        : { impact: '0', reason: 'Acceptable cloud cover' },
      current: `${weather.cloudCover}%`
    },
    {
      category: 'Precipitation',
      condition: weather.precipitation > 50
        ? { impact: '-20', reason: 'High chance of rain' }
        : weather.precipitation > 30
        ? { impact: '-10', reason: 'Moderate chance of rain' }
        : { impact: '0', reason: 'Low chance of rain' },
      current: `${weather.precipitation}%`
    },
    {
      category: 'Barometric Pressure',
      condition: weather.pressure >= 1010 && weather.pressure <= 1020
        ? { impact: '+5', reason: 'Stable pressure range' }
        : { impact: '0', reason: 'Pressure outside optimal range' },
      current: `${weather.pressure} hPa`
    }
  ];

  if (moonPhase) {
    scoreFactors.push({
      category: 'Moon Phase',
      condition: moonPhase.phase === 'Full Moon' || moonPhase.phase === 'New Moon'
        ? { impact: '+10', reason: 'Full/New Moon period' }
        : { impact: '0', reason: 'Regular moon phase' },
      current: moonPhase.phase
    });
  }

  if (tide) {
    scoreFactors.push({
      category: 'Tide',
      condition: (tide.state === 'incoming' || tide.state === 'outgoing') &&
                (tide.height > 0.5 && tide.height < 2)
        ? { impact: '+15', reason: 'Optimal tide conditions' }
        : (tide.state === 'incoming' || tide.state === 'outgoing')
        ? { impact: '+10', reason: 'Active tide movement' }
        : { impact: '0', reason: 'Regular tide conditions' },
      current: `${tide.state} (${tide.height.toFixed(1)}m)`
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-2xl my-8">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-lg font-semibold">Fishing Score Calculation</h3>
            <p className="text-sm text-gray-600">Base score: 70 points</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {scoreFactors.map((factor, index) => (
            <div 
              key={index}
              className="bg-gray-50 rounded-lg p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{factor.category}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  factor.condition.impact.startsWith('+')
                    ? 'bg-green-100 text-green-800'
                    : factor.condition.impact.startsWith('-')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {factor.condition.impact}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Current:</span>
                  <span className="font-medium">{factor.current}</span>
                </div>
                <div className="mt-0.5 text-gray-500">{factor.condition.reason}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            The final score is calculated by adding all adjustments to the base score (70) and is capped between 0 and 100.
          </p>
        </div>
      </div>
    </div>
  );
}