import React, { useState } from 'react';
import { Sun, Cloud, CloudRain, Waves, Wind, Thermometer, Droplets, Gauge, HelpCircle } from 'lucide-react';
import type { FishingForecast } from '../types';
import { format } from 'date-fns';
import { useSettings } from '../context/SettingsContext';
import { TideChart } from './TideChart';
import { MoonPhaseInfo } from './MoonPhaseInfo';
import { ScoreInfo } from './ScoreInfo';

interface ForecastDisplayProps {
  forecast: FishingForecast;
}

const conditionIcons = {
  Good: Sun,
  Okay: Cloud,
  Poor: CloudRain,
};

export function ForecastDisplay({ forecast }: ForecastDisplayProps) {
  const [showTideChart, setShowTideChart] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const Icon = conditionIcons[forecast.condition];
  const { convertTemperature, convertWindSpeed, convertPressure } = useSettings();
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Current Conditions</h2>
        <span className="text-sm text-gray-500">
          {format(forecast.timestamp, 'PPP p')}
        </span>
      </div>
      
      <div className={`flex items-center justify-center p-6 rounded-lg mb-4 ${
        forecast.condition === 'Good' ? 'bg-green-100' :
        forecast.condition === 'Okay' ? 'bg-yellow-100' : 'bg-red-100'
      }`}>
        <Icon className={`h-12 w-12 mr-4 ${
          forecast.condition === 'Good' ? 'text-green-500' :
          forecast.condition === 'Okay' ? 'text-yellow-500' : 'text-red-500'
        }`} />
        <div>
          <h3 className="text-xl font-semibold">{forecast.condition}</h3>
          <div className="flex items-center">
            <p className="text-gray-600 mr-2">Score: {forecast.score}/100</p>
            <button
              onClick={() => setShowScoreInfo(true)}
              className="text-gray-500 hover:text-gray-700"
              title="View score calculation"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <Gauge className="h-4 w-4 mr-2" />
            Weather Conditions
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center text-gray-600">
              <Wind className="h-4 w-4 mr-2" />
              <span>{convertWindSpeed(forecast.weather.windSpeed)} {forecast.weather.windDirection}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Thermometer className="h-4 w-4 mr-2" />
              <span>{convertTemperature(forecast.weather.temperature)}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Cloud className="h-4 w-4 mr-2" />
              <span>{forecast.weather.cloudCover}% clouds</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Droplets className="h-4 w-4 mr-2" />
              <span>{forecast.weather.precipitation}% rain</span>
            </div>
          </div>
        </div>

        {forecast.tide && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold flex items-center">
                <Waves className="h-4 w-4 mr-2" />
                Tide Information
              </h4>
              <button
                onClick={() => setShowTideChart(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View Tide Chart
              </button>
            </div>
            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between items-center">
                <span>Current State:</span>
                <span className="font-medium">{forecast.tide.state}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Height:</span>
                <span className="font-medium">{forecast.tide.height.toFixed(1)}m</span>
              </div>
              {forecast.tide.nextHigh && (
                <div className="flex justify-between items-center">
                  <span>Next High Tide:</span>
                  <span className="font-medium">{format(forecast.tide.nextHigh, 'h:mm a')}</span>
                </div>
              )}
              {forecast.tide.nextLow && (
                <div className="flex justify-between items-center">
                  <span>Next Low Tide:</span>
                  <span className="font-medium">{format(forecast.tide.nextLow, 'h:mm a')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {forecast.moonPhase && (
          <MoonPhaseInfo moonPhase={forecast.moonPhase} />
        )}

        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Fishing Conditions:</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            {forecast.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>

      {showTideChart && forecast.tide && (
        <TideChart
          tide={forecast.tide}
          onClose={() => setShowTideChart(false)}
        />
      )}

      {showScoreInfo && (
        <ScoreInfo
          weather={forecast.weather}
          tide={forecast.tide}
          moonPhase={forecast.moonPhase}
          onClose={() => setShowScoreInfo(false)}
        />
      )}
    </div>
  );
}