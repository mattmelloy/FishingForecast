import React from 'react';
import { Settings } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function SettingsPanel() {
  const {
    units,
    setUnits,
    showDebugInfo,
    setShowDebugInfo
  } = useSettings();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Settings"
      >
        <Settings className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 bg-white rounded-lg shadow-xl p-6 w-80 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Settings</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Options
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showDebugInfo"
                    checked={showDebugInfo}
                    onChange={(e) => setShowDebugInfo(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <label htmlFor="showDebugInfo" className="ml-2 text-sm text-gray-700">
                    Show API Debug Information
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="temperature"
                    value="fahrenheit"
                    checked={units.temperature === 'fahrenheit'}
                    onChange={(e) =>
                      setUnits({ ...units, temperature: e.target.value as 'fahrenheit' | 'celsius' })
                    }
                  />
                  <span className="ml-2">Fahrenheit (°F)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="temperature"
                    value="celsius"
                    checked={units.temperature === 'celsius'}
                    onChange={(e) =>
                      setUnits({ ...units, temperature: e.target.value as 'fahrenheit' | 'celsius' })
                    }
                  />
                  <span className="ml-2">Celsius (°C)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wind Speed
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="windSpeed"
                    value="mph"
                    checked={units.windSpeed === 'mph'}
                    onChange={(e) =>
                      setUnits({ ...units, windSpeed: e.target.value as 'mph' | 'kph' })
                    }
                  />
                  <span className="ml-2">Miles per hour (mph)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="windSpeed"
                    value="kph"
                    checked={units.windSpeed === 'kph'}
                    onChange={(e) =>
                      setUnits({ ...units, windSpeed: e.target.value as 'mph' | 'kph' })
                    }
                  />
                  <span className="ml-2">Kilometers per hour (km/h)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pressure
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="pressure"
                    value="hPa"
                    checked={units.pressure === 'hPa'}
                    onChange={(e) =>
                      setUnits({ ...units, pressure: e.target.value as 'hPa' | 'inHg' })
                    }
                  />
                  <span className="ml-2">Hectopascals (hPa)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="pressure"
                    value="inHg"
                    checked={units.pressure === 'inHg'}
                    onChange={(e) =>
                      setUnits({ ...units, pressure: e.target.value as 'hPa' | 'inHg' })
                    }
                  />
                  <span className="ml-2">Inches of Mercury (inHg)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}