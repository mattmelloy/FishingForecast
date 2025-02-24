import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Waves } from 'lucide-react';
import type { TideInfo } from '../types';

interface TideChartProps {
  tide: TideInfo & { rawData?: any };
  onClose: () => void;
}

interface TidePoint {
  x: number;
  y: number;
  time: Date;
  height: number;
  type?: string;
}

const GRAPH_HEIGHT = 200;
const GRAPH_WIDTH = 720;
const PADDING = 50;

export function TideChart({ tide, onClose }: TideChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<TidePoint | null>(null);

  const { points, pathD, yAxisLabels, xAxisLabels } = useMemo(() => {
    if (!tide.rawData?.data?.weather) {
      return { points: [], pathD: '', yAxisLabels: [], xAxisLabels: [] };
    }

    const now = new Date();
    const points: { time: Date; height: number; type?: string }[] = [];

    // Process tide data from all available weather days
    tide.rawData.data.weather.forEach((day: any) => {
      if (day?.tides?.[0]?.tide_data) {
        day.tides[0].tide_data.forEach((tidePoint: any) => {
          const time = new Date(tidePoint.tideDateTime);
          const height = parseFloat(tidePoint.tideHeight_mt);

          // Only include points within the next 48 hours
          if (!isNaN(height) && 
              time >= now && 
              time <= new Date(now.getTime() + 48 * 60 * 60 * 1000)) {
            points.push({
              time,
              height,
              type: tidePoint.tide_type.toUpperCase()
            });
          }
        });
      }
    });

    // Sort points by time
    points.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Add current point if not already included
    if (points.length > 0 && points[0].time > now) {
      points.unshift({
        time: now,
        height: tide.height
      });
    }

    if (points.length < 2) {
      return { points: [], pathD: '', yAxisLabels: [], xAxisLabels: [] };
    }

    const maxHeight = Math.max(...points.map(p => p.height));
    const minHeight = Math.min(...points.map(p => p.height));
    const heightRange = maxHeight - minHeight;

    // Scale points to graph dimensions
    const timeRange = points[points.length - 1].time.getTime() - points[0].time.getTime();
    const xScale = (GRAPH_WIDTH - PADDING * 2) / timeRange;
    const yScale = (GRAPH_HEIGHT - PADDING * 2) / heightRange;

    const scaledPoints = points.map(point => ({
      x: PADDING + (point.time.getTime() - points[0].time.getTime()) * xScale,
      y: GRAPH_HEIGHT - PADDING - (point.height - minHeight) * yScale,
      ...point
    }));

    // Create SVG path using cubic bezier curves for smoother lines
    const pathD = scaledPoints.reduce((path, point, i) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      
      const prev = scaledPoints[i - 1];
      const cp1x = prev.x + (point.x - prev.x) / 3;
      const cp2x = prev.x + (point.x - prev.x) * 2 / 3;
      
      return `${path} C ${cp1x},${prev.y} ${cp2x},${point.y} ${point.x},${point.y}`;
    }, '');

    // Generate axis labels
    const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
      const height = minHeight + (heightRange * i) / 4;
      return {
        value: height.toFixed(1),
        y: GRAPH_HEIGHT - PADDING - (height - minHeight) * yScale
      };
    });

    // Create hour markers every 3 hours
    const xAxisLabels = [];
    const startTime = points[0].time;
    const endTime = points[points.length - 1].time;
    
    for (let time = new Date(startTime); time <= endTime; time = new Date(time.getTime() + 3 * 60 * 60 * 1000)) {
      xAxisLabels.push({
        value: format(time, 'ha'),
        x: PADDING + (time.getTime() - startTime.getTime()) * xScale,
        isMainLabel: time.getHours() % 12 === 0,
        date: format(time, 'MMM d')
      });
    }

    return { points: scaledPoints, pathD, yAxisLabels, xAxisLabels };
  }, [tide]);

  if (!points.length) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h3 className="text-xl font-semibold mb-4">No tide data available</h3>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Waves className="w-6 h-6 mr-2" />
            48-Hour Tide Forecast
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="overflow-x-auto">
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
              {yAxisLabels.map(({ value, y }, i) => (
                <g key={i}>
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
                    {value}m
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
              {xAxisLabels.map(({ value, x, isMainLabel, date }, i) => (
                <g key={i}>
                  <line
                    x1={x}
                    y1={GRAPH_HEIGHT - PADDING}
                    x2={x}
                    y2={GRAPH_HEIGHT - PADDING + 5}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={GRAPH_HEIGHT - PADDING + 20}
                    textAnchor="middle"
                    className={`text-xs fill-gray-500 ${isMainLabel ? 'font-semibold' : ''}`}
                  >
                    {value}
                  </text>
                  {isMainLabel && (
                    <text
                      x={x}
                      y={GRAPH_HEIGHT - PADDING + 35}
                      textAnchor="middle"
                      className="text-xs fill-gray-500 font-semibold"
                    >
                      {date}
                    </text>
                  )}
                </g>
              ))}

              {/* Tide curve */}
              <path
                d={pathD}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
              />

              {/* Data points */}
              {points.map((point, i) => (
                <g key={i}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.type ? 4 : 3}
                    fill={point.type === 'HIGH' ? '#ef4444' : point.type === 'LOW' ? '#3b82f6' : '#9ca3af'}
                    className="transition-all duration-200 cursor-pointer hover:r-6"
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {hoveredPoint === point && (
                    <g>
                      <rect
                        x={point.x + 10}
                        y={point.y - 40}
                        width="120"
                        height="35"
                        rx="4"
                        fill="white"
                        stroke="#e5e7eb"
                      />
                      <text
                        x={point.x + 20}
                        y={point.y - 25}
                        className="text-xs fill-gray-700"
                      >
                        {format(point.time, 'MMM d, h:mm a')}
                      </text>
                      <text
                        x={point.x + 20}
                        y={point.y - 10}
                        className="text-xs fill-gray-700 font-semibold"
                      >
                        {point.type ? `${point.type} TIDE` : 'Height'}: {point.height.toFixed(2)}m
                      </text>
                    </g>
                  )}
                </g>
              ))}

              {/* Current time marker */}
              <line
                x1={PADDING}
                y1={PADDING}
                x2={PADDING}
                y2={GRAPH_HEIGHT - PADDING}
                stroke="#ef4444"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p>Current tide: {tide.state}, Height: {tide.height.toFixed(1)}m</p>
          {tide.nextHigh && (
            <p>Next high tide: {format(tide.nextHigh, 'h:mm a')}</p>
          )}
          {tide.nextLow && (
            <p>Next low tide: {format(tide.nextLow, 'h:mm a')}</p>
          )}
        </div>
      </div>
    </div>
  );
}