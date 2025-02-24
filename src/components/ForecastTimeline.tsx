import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Cloud, CloudRain, Sun, Wind, Thermometer, Droplets, Gauge, Waves } from 'lucide-react';
import type { ForecastTimeline, FishingCondition, TimelinePoint } from '../types';
import { useSettings } from '../context/SettingsContext';

interface ForecastTimelineProps {
  timeline: ForecastTimeline;
  loading?: boolean;
}

const GRAPH_HEIGHT = 200;
const GRAPH_WIDTH = 720;
const PADDING = 50;
const POINT_RADIUS = 4;

const getConditionColor = (condition: FishingCondition): string => {
  switch (condition) {
    case 'Good':
      return '#22c55e';
    case 'Okay':
      return '#eab308';
    case 'Poor':
      return '#ef4444';
  }
};

const getConditionIcon = (condition: FishingCondition) => {
  switch (condition) {
    case 'Good':
      return Sun;
    case 'Okay':
      return Cloud;
    case 'Poor':
      return CloudRain;
  }
};

export function ForecastTimeline({ timeline, loading = false }: ForecastTimelineProps) {
  const [selectedPoint, setSelectedPoint] = useState<(TimelinePoint & { x: number; y: number }) | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const { convertTemperature, convertWindSpeed, convertPressure } = useSettings();

  const { points, pathD, yAxisLabels, xAxisLabels } = useMemo(() => {
    if (!timeline?.points?.length) {
      return {
        points: [],
        pathD: '',
        yAxisLabels: [],
        xAxisLabels: []
      };
    }

    const sortedPoints = [...timeline.points].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    const startTime = sortedPoints[0].timestamp;
    const endTime = sortedPoints[sortedPoints.length - 1].timestamp;
    const timeRange = endTime.getTime() - startTime.getTime();

    const xScale = (GRAPH_WIDTH - PADDING * 2) / timeRange;
    const yScale = (GRAPH_HEIGHT - PADDING * 2) / 100;

    const pathPoints = sortedPoints.map(point => ({
      x: PADDING + (point.timestamp.getTime() - startTime.getTime()) * xScale,
      y: GRAPH_HEIGHT - PADDING - point.score * yScale,
      ...point,
    }));

    const pathD = `M ${pathPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;

    // Reduced number of Y-axis labels
    const yAxisLabels = [0, 50, 100].map(score => ({
      value: score,
      y: GRAPH_HEIGHT - PADDING - score * yScale,
    }));

    // Filter X-axis labels to show only every 6 hours (reducing clutter)
    const xAxisLabels = sortedPoints
      .filter((_, index) => index % 2 === 0) // Show every other point to reduce density
      .map(point => ({
        value: format(point.timestamp, 'MMM d, ha'),
        x: PADDING + (point.timestamp.getTime() - startTime.getTime()) * xScale,
        isMainLabel: point.timestamp.getHours() === 12 // Highlight noon labels
      }));

    return { points: pathPoints, pathD, yAxisLabels, xAxisLabels };
  }, [timeline]);

  const handlePointClick = (point: TimelinePoint & { x: number; y: number }, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left;
    const y = rect.top;
    
    setSelectedPoint(point);
    setTooltipPosition({ x, y });
  };

  const handlePointMouseLeave = () => {
    setSelectedPoint(null);
    setTooltipPosition(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl">
        <h3 className="text-xl font-semibold mb-4">5-Day Forecast</h3>
        <div className="flex items-center justify-center h-[200px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-500">Loading forecast data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!timeline?.points?.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl">
        <h3 className="text-xl font-semibold mb-4">5-Day Forecast</h3>
        <div className="flex items-center justify-center h-[200px] text-gray-500">
          No forecast data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl">
      <h3 className="text-xl font-semibold mb-4">5-Day Forecast</h3>
      <div className="relative overflow-x-auto">
        <div className="min-w-[720px]">
          <svg
            width={GRAPH_WIDTH}
            height={GRAPH_HEIGHT + 40}
            className="overflow-visible"
          >
            {/* Y-axis */}
            <line
              x1={PADDING}
              y1={PADDING}
              x2={PADDING}
              y2={GRAPH_HEIGHT - PADDING}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            {yAxisLabels.map(({ value, y }) => (
              <g key={value}>
                <line
                  x1={PADDING - 5}
                  y1={y}
                  x2={GRAPH_WIDTH - PADDING}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
                <text
                  x={PADDING - 10}
                  y={y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="text-xs fill-gray-500"
                >
                  {value}
                </text>
              </g>
            ))}

            {/* X-axis */}
            <line
              x1={PADDING}
              y1={GRAPH_HEIGHT - PADDING}
              x2={GRAPH_WIDTH - PADDING}
              y2={GRAPH_HEIGHT - PADDING}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            {xAxisLabels.map(({ value, x, isMainLabel }, i) => (
              <text
                key={i}
                x={x}
                y={GRAPH_HEIGHT - PADDING + 25}
                textAnchor="middle"
                transform={`rotate(45, ${x}, ${GRAPH_HEIGHT - PADDING + 25})`}
                className={`text-xs fill-gray-500 ${isMainLabel ? 'font-semibold' : ''}`}
              >
                {value}
              </text>
            ))}

            {/* Line graph */}
            <path
              d={pathD}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />

            {/* Data points */}
            {points.map((point, i) => {
              const ConditionIcon = getConditionIcon(point.condition);
              return (
                <g key={i}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={selectedPoint === point ? POINT_RADIUS * 1.5 : POINT_RADIUS}
                    fill={getConditionColor(point.condition)}
                    className="transition-all duration-200 cursor-pointer hover:r-6"
                    onClick={(e) => handlePointClick(point, e)}
                    onMouseLeave={handlePointMouseLeave}
                  />
                  <ConditionIcon
                    x={point.x - 8}
                    y={point.y - 24}
                    className={`w-4 h-4 ${
                      selectedPoint === point ? 'opacity-100' : 'opacity-0'
                    } transition-opacity duration-200`}
                    style={{
                      transform: `translate(${point.x - 8}px, ${point.y - 24}px)`,
                      color: getConditionColor(point.condition)
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Enhanced Tooltip */}
          {selectedPoint && tooltipPosition && (
            <div
              className="absolute bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-10 min-w-[240px]"
              style={{
                left: tooltipPosition.x,
                top: tooltipPosition.y - 180,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">
                  {format(selectedPoint.timestamp, 'PPP p')}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-sm ${
                    selectedPoint.condition === 'Good'
                      ? 'bg-green-100 text-green-800'
                      : selectedPoint.condition === 'Okay'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {selectedPoint.condition}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Gauge className="w-4 h-4 mr-2" />
                  <span>Score: {selectedPoint.score}/100</span>
                </div>
                {selectedPoint.weather && (
                  <>
                    <div className="flex items-center text-sm text-gray-600">
                      <Wind className="w-4 h-4 mr-2" />
                      <span>Wind: {convertWindSpeed(selectedPoint.weather.windSpeed)} {selectedPoint.weather.windDirection}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Thermometer className="w-4 h-4 mr-2" />
                      <span>Temperature: {convertTemperature(selectedPoint.weather.temperature)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Cloud className="w-4 h-4 mr-2" />
                      <span>Cloud Cover: {selectedPoint.weather.cloudCover}%</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Droplets className="w-4 h-4 mr-2" />
                      <span>Precipitation: {selectedPoint.weather.precipitation}%</span>
                    </div>
                  </>
                )}
                {selectedPoint.tide && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Waves className="w-4 h-4 mr-2" />
                    <span>Tide: {selectedPoint.tide.state} ({selectedPoint.tide.height.toFixed(1)}m)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center mt-8 space-x-4">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
          <span className="text-sm text-gray-600">Good</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
          <span className="text-sm text-gray-600">Okay</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
          <span className="text-sm text-gray-600">Poor</span>
        </div>
      </div>
    </div>
  );
}