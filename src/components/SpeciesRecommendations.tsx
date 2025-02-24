import React from 'react';
import { Fish } from 'lucide-react';

interface SpeciesRecommendationsProps {
  species: string[];
}

export function SpeciesRecommendations({ species }: SpeciesRecommendationsProps) {
  if (!species?.length) return null;

  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-2 flex items-center">
        <Fish className="h-4 w-4 mr-2" />
        Recommended Species
      </h4>
      <ul className="space-y-1">
        {species.map((fish, index) => (
          <li
            key={index}
            className="flex items-center text-sm text-gray-600 bg-blue-50 rounded-lg p-2"
          >
            {fish}
          </li>
        ))}
      </ul>
    </div>
  );
}