import React, { createContext, useContext, useState } from 'react';
import type { UnitPreferences } from '../types';

interface SettingsContextType {
  units: UnitPreferences;
  showDebugInfo: boolean;
  setUnits: (units: UnitPreferences) => void;
  setShowDebugInfo: (show: boolean) => void;
  convertTemperature: (value: number) => string;
  convertWindSpeed: (value: number) => string;
  convertPressure: (value: number) => string;
}

const defaultUnits: UnitPreferences = {
  temperature: 'celsius',
  windSpeed: 'kph',
  pressure: 'hPa'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnits] = useState<UnitPreferences>(defaultUnits);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const convertTemperature = (value: number) => {
    if (units.temperature === 'celsius') {
      const celsius = ((value - 32) * 5) / 9;
      return `${celsius.toFixed(1)}°C`;
    }
    return `${value}°F`;
  };

  const convertWindSpeed = (value: number) => {
    if (units.windSpeed === 'kph') {
      const kph = value * 1.60934;
      return `${kph.toFixed(1)} km/h`;
    }
    return `${value} mph`;
  };

  const convertPressure = (value: number) => {
    if (units.pressure === 'inHg') {
      const inHg = value / 33.86389;
      return `${inHg.toFixed(2)} inHg`;
    }
    return `${value} hPa`;
  };

  return (
    <SettingsContext.Provider
      value={{
        units,
        showDebugInfo,
        setUnits,
        setShowDebugInfo,
        convertTemperature,
        convertWindSpeed,
        convertPressure
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}