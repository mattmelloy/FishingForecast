import React from 'react';
import { Code } from 'lucide-react';

interface ApiDebugProps {
  weatherData: any;
  tideData: any;
}

export function ApiDebug({ weatherData, tideData }: ApiDebugProps) {
  return (
    <div className="mt-8 bg-gray-50 rounded-lg p-4 w-full max-w-4xl">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Code className="w-5 h-5 mr-2" />
        API Debug Information
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Marine/Tide API Raw Response:</h4>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
            {JSON.stringify(tideData, null, 2)}
          </pre>
        </div>

        <div>
          <h4 className="font-medium mb-2">Weather API Raw Response:</h4>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
            {JSON.stringify(weatherData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}