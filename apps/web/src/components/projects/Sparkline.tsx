'use client';

interface SparklineDataPoint {
  x: string; // date or label
  y: number; // value
}

interface SparklineProps {
  data: SparklineDataPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
}

/**
 * [INSIGHTS-1] Sparkline Component
 *
 * Simple SVG-based sparkline chart for trend visualization.
 * Pure read-only display component.
 */
export function Sparkline({
  data,
  height = 60,
  color = '#3B82F6',
  showLabels = false,
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const width = 300;
  const padding = {
    top: 10,
    right: 10,
    bottom: showLabels ? 20 : 10,
    left: 10,
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.y);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Calculate points for the line
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
    const y =
      padding.top + chartHeight - ((d.y - minValue) / valueRange) * chartHeight;
    return { x, y, value: d.y, label: d.x };
  });

  // Create path for line
  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  // Create path for area fill
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${height - padding.bottom}` +
    ` L ${points[0].x} ${height - padding.bottom}` +
    ' Z';

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      {/* Gradient for area fill */}
      <defs>
        <linearGradient
          id={`sparkline-gradient-${color.replace('#', '')}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={4}
          fill={color}
        />
      )}

      {/* Labels (optional) */}
      {showLabels && points.length > 0 && (
        <>
          <text
            x={points[0].x}
            y={height - 4}
            fontSize={10}
            fill="#9CA3AF"
            textAnchor="start"
          >
            {points[0].label}
          </text>
          <text
            x={points[points.length - 1].x}
            y={height - 4}
            fontSize={10}
            fill="#9CA3AF"
            textAnchor="end"
          >
            {points[points.length - 1].label}
          </text>
        </>
      )}
    </svg>
  );
}
