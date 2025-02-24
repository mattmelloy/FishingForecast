import { MoonPhase } from '../types';

function getMoonAge(date: Date): number {
  // Known new moon reference date
  const knownNewMoon = new Date('2000-01-06T18:14:00.000Z');
  const synodicMonth = 29.530588853; // Length of lunar month in days
  
  const timeDiff = date.getTime() - knownNewMoon.getTime();
  const daysSinceNewMoon = timeDiff / (1000 * 60 * 60 * 24);
  const moonAge = daysSinceNewMoon % synodicMonth;
  
  return moonAge;
}

function getNextPhaseDate(currentAge: number, targetAge: number): Date {
  const synodicMonth = 29.530588853;
  const now = new Date();
  
  let daysUntilPhase = targetAge - currentAge;
  if (daysUntilPhase < 0) {
    daysUntilPhase += synodicMonth;
  }
  
  return new Date(now.getTime() + daysUntilPhase * 24 * 60 * 60 * 1000);
}

export function getMoonPhase(date: Date): MoonPhase {
  const age = getMoonAge(date);
  const illumination = Math.cos((age / 29.530588853) * 2 * Math.PI - Math.PI) * 0.5 + 0.5;

  let phase: string;
  if (age < 1.84566) phase = 'New Moon';
  else if (age < 5.53699) phase = 'Waxing Crescent';
  else if (age < 9.22831) phase = 'First Quarter';
  else if (age < 12.91963) phase = 'Waxing Gibbous';
  else if (age < 16.61096) phase = 'Full Moon';
  else if (age < 20.30228) phase = 'Waning Gibbous';
  else if (age < 23.99361) phase = 'Last Quarter';
  else if (age < 27.68493) phase = 'Waning Crescent';
  else phase = 'New Moon';

  // Calculate next full and new moon dates
  const nextFullMoon = getNextPhaseDate(age, 14.765);
  const nextNewMoon = getNextPhaseDate(age, 29.530588853);

  return {
    phase,
    illumination: Math.round(illumination * 100),
    age: Math.round(age * 10) / 10,
    nextFullMoon,
    nextNewMoon
  };
}