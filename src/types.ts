export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocationInfo = {
  coordinates: Coordinates;
  displayName: string;
};

export type FishingCondition = 'Good' | 'Okay' | 'Poor';

export type UnitPreferences = {
  temperature: 'celsius' | 'fahrenheit';
  windSpeed: 'mph' | 'kph';
  pressure: 'hPa' | 'inHg';
};

export type WeatherData = {
  windSpeed: number;
  windDirection: string;
  temperature: number;
  precipitation: number;
  cloudCover: number;
  pressure: number;
};

export type MoonPhase = {
  phase: string;
  illumination: number;
  age: number;
  nextFullMoon: Date;
  nextNewMoon: Date;
};

export type TideInfo = {
  height: number;
  state: string;
  nextHigh?: Date;
  nextLow?: Date;
  rawData?: any;
};

export type FishingForecast = {
  condition: FishingCondition;
  score: number;
  reasons: string[];
  weather: WeatherData;
  tide?: TideInfo;
  timestamp: Date;
  moonPhase?: MoonPhase;
};

export type TimelinePoint = {
  timestamp: Date;
  score: number;
  condition: FishingCondition;
  weather?: WeatherData;
  tide?: TideInfo;
  moonPhase?: MoonPhase;
};

export type ForecastTimeline = {
  points: TimelinePoint[];
};