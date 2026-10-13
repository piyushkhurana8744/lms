'use client';

import React, { useState } from 'react';
import { AnalyticsTimeSeriesPoint } from '@edtech/types';

interface TimeSeriesChartProps {
  title: string;
  data: AnalyticsTimeSeriesPoint[];
  metricLabel?: string;
  formatValue?: (val: number) => string;
  height?: number;
  color?: string;
  loading?: boolean;
}

export function TimeSeriesChart({
  title,
  data = [],
  metricLabel = 'Value',
  formatValue = (v) => v.toLocaleString(),
  height = 180,
  color = '#BE1E2E',
  loading = false,
}: TimeSeriesChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<AnalyticsTimeSeriesPoint | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="h-4 w-32 rounded bg-muted animate-pulse"></div>
        <div className="mt-4 flex items-end gap-2" style={{ height }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-muted animate-pulse"
              style={{ height: `${20 + (i % 5) * 15}%` }}
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center shadow-sm" style={{ minHeight: height + 60 }}>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-xs text-muted-foreground">No trend data available for this range.</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {hoveredPoint ? (
              <span className="font-semibold text-foreground">
                {hoveredPoint.bucket}: {formatValue(hoveredPoint.value)} {hoveredPoint.label ? `(${hoveredPoint.label})` : ''}
              </span>
            ) : (
              `Peak: ${formatValue(maxValue)}`
            )}
          </p>
        </div>
      </div>

      {/* SVG / Bar Chart Area */}
      <div className="relative mt-4 flex items-end gap-1.5 pt-4" style={{ height }}>
        {data.map((point, index) => {
          const barHeightPercent = Math.max((point.value / maxValue) * 100, 4);
          const isHovered = hoveredPoint?.bucket === point.bucket;

          return (
            <div
              key={point.bucket || index}
              className="group relative flex flex-1 flex-col items-center h-full justify-end"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Bar */}
              <div
                className="w-full rounded-t transition-all group-hover:opacity-100"
                style={{
                  height: `${barHeightPercent}%`,
                  backgroundColor: isHovered ? color : `${color}cc`,
                  boxShadow: isHovered ? `0 0 10px ${color}88` : undefined,
                }}
              ></div>

              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-10 z-10 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-semibold text-popover-foreground shadow-lg border border-border pointer-events-none">
                  {point.bucket}: {formatValue(point.value)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.bucket}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.bucket}</span>}
        <span>{data[data.length - 1]?.bucket}</span>
      </div>
    </div>
  );
}
