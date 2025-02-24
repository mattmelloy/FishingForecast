import React, { useState } from 'react';
import { Fish, Clock } from 'lucide-react';
import { LocationInput } from './components/LocationInput';
import { ForecastDisplay } from './components/ForecastDisplay';
import { ForecastTimeline } from './components/ForecastTimeline';
import { SettingsPanel } from './components/SettingsPanel';
import { ApiDebug } from './components/ApiDebug';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { useForecast } from './hooks/useForecast';
import type { LocationInfo } from './types';

export default function App() {
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const { forecast, timeline, rawData, isLoading, error } = useForecast(selectedLocation);
  const { showDebugInfo } = useSettings();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="relative h-[400px]">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2070")'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Fish className="h-14 w-14" />
              <h1 className="text-5xl font-bold tracking-tight">Fishing Forecast</h1>
            </div>
            <p className="text-xl text-gray-100 max-w-2xl px-4 mb-8 leading-relaxed">
              Get real-time fishing conditions and forecasts for your location. 
              Find the perfect time to cast your line with accurate weather, tide, and moon phase data.
            </p>
            <div className="max-w-md mx-auto px-4">
              <LocationInput onLocationSelect={setSelectedLocation} />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {selectedLocation && (
          <div className="flex flex-col items-center space-y-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowTimeline(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !showTimeline
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Current Conditions
              </button>
              <button
                onClick={() => setShowTimeline(true)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  showTimeline
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>5-Day Forecast</span>
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 p-4 bg-red-50 rounded-lg">
                {error}
              </div>
            ) : showTimeline && timeline ? (
              <ForecastTimeline timeline={timeline} />
            ) : forecast ? (
              <ForecastDisplay forecast={forecast} />
            ) : null}

            {showDebugInfo && rawData && (
              <ApiDebug
                weatherData={rawData.weather}
                tideData={rawData.tide}
              />
            )}
          </div>
        )}
      </main>

      <SettingsPanel />
    </div>
  );
}