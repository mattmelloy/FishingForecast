import React, { useState } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import type { LocationInfo } from '../types';

interface LocationInputProps {
  onLocationSelect: (location: LocationInfo) => void;
}

export function LocationInput({ onLocationSelect }: LocationInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { loading, error, getLocation } = useGeolocation();

  const handleGeolocation = async () => {
    try {
      const locationData = await getLocation();
      if (!locationData) {
        throw new Error('Could not get location');
      }

      // Immediately set coordinates as display name while we fetch the actual address
      const coordsDisplay = `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`;
      setSearchQuery(coordsDisplay);
      
      // Create initial location info with coordinates
      const initialLocationInfo: LocationInfo = {
        coordinates: locationData,
        displayName: coordsDisplay
      };
      
      // Immediately trigger the forecast with coordinates
      onLocationSelect(initialLocationInfo);

      // Then try to get the actual address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'FishingConditionsApp/1.0'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch location data');
        }

        const data = await response.json();
        if (data?.display_name) {
          // Update with actual address if available
          setSearchQuery(data.display_name);
          onLocationSelect({
            coordinates: locationData,
            displayName: data.display_name
          });
        }
      } catch (error) {
        // If reverse geocoding fails, we already have coordinates displayed
        console.warn('Reverse geocoding failed:', error);
      }
    } catch (error) {
      setSearchError('Could not get your location. Please try again or enter it manually.');
      console.error('Geolocation error:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'FishingConditionsApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const locationInfo: LocationInfo = {
          coordinates: {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon)
          },
          displayName: result.display_name
        };
        setSearchQuery(locationInfo.displayName);
        onLocationSelect(locationInfo);
        setSearchError(null);
      } else {
        setSearchError('No locations found. Please try a different search term.');
      }
    } catch (error) {
      setSearchError('Error searching location. Please try again.');
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSearch} className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="Enter location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isSearching || loading}
        />
        <button
          type="button"
          onClick={handleGeolocation}
          disabled={loading || isSearching}
          className="absolute inset-y-0 right-0 px-3 flex items-center bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
        >
          {loading || isSearching ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Navigation className="h-5 w-5" />
          )}
        </button>
      </form>
      {(error || searchError) && (
        <p className="mt-2 text-sm text-red-600">{error || searchError}</p>
      )}
    </div>
  );
}