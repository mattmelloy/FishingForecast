import React from 'react';
import { Moon } from 'lucide-react';
import { format } from 'date-fns';
import type { MoonPhase } from '../types';

interface MoonPhaseInfoProps {
  moonPhase: MoonPhase;
}

export function MoonPhaseInfo({ moonPhase }: MoonPhaseInfoProps) {
  return (
    <div className="bg-indigo-50 rounded-lg p-4">
      <h4 className="font-semibold mb-3 flex items-center">
        <Moon className="h-4 w-4 mr-2" />
        Moon Phase
      </h4>
      <div className="space-y-2 text-gray-600">
        <div className="flex justify-between items-center">
          <span>Current Phase:</span>
          <span className="font-medium">{moonPhase.phase}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Moon Age:</span>
          <span className="font-medium">{moonPhase.age} days</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Illumination:</span>
          <span className="font-medium">{moonPhase.illumination}%</span>
        </div>
        <div className="mt-3 pt-3 border-t border-indigo-100">
          <div className="text-sm">
            <div className="mb-1">
              Next Full Moon: {format(moonPhase.nextFullMoon, 'MMM d, yyyy')}
            </div>
            <div>
              Next New Moon: {format(moonPhase.nextNewMoon, 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}