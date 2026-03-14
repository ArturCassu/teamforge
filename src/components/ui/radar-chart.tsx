'use client';

import type { SkillData } from '@/lib/api';

interface RadarChartProps {
  scores: Record<string, number>;
  skills: SkillData[];
  size?: number;
  color?: string;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number,
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

export function RadarChart({
  scores,
  skills,
  size = 300,
  color = '#3B82F6',
}: RadarChartProps) {
  const count = skills.length;
  if (count < 3) return null; // Radar needs at least 3 axes

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.36;
  const labelRadius = size * 0.46;
  const startAngle = -Math.PI / 2;

  const rings = [0.25, 0.5, 0.75, 1];

  const axisPoints = skills.map((_, i) => {
    const angle = startAngle + (2 * Math.PI * i) / count;
    return {
      angle,
      outer: polarToCartesian(cx, cy, maxRadius, angle),
      label: polarToCartesian(cx, cy, labelRadius, angle),
    };
  });

  // Data polygon points
  const dataPoints = skills.map((skill, i) => {
    const val = scores[skill.id] ?? 0;
    const normalizedRadius = (val / 10) * maxRadius;
    const angle = startAngle + (2 * Math.PI * i) / count;
    return polarToCartesian(cx, cy, normalizedRadius, angle);
  });

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // For many skills, truncate labels
  const maxLabelLen = count > 15 ? 6 : count > 8 ? 10 : 20;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="select-none"
    >
      {/* Grid rings */}
      {rings.map((scale) => {
        const ringPoints = skills.map((_, i) => {
          const angle = startAngle + (2 * Math.PI * i) / count;
          return polarToCartesian(cx, cy, maxRadius * scale, angle);
        });
        const polygon = ringPoints.map((p) => `${p.x},${p.y}`).join(' ');
        return (
          <polygon
            key={scale}
            points={polygon}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-zinc-700"
          />
        );
      })}

      {/* Axis lines */}
      {axisPoints.map((ap, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={ap.outer.x}
          y2={ap.outer.y}
          stroke="currentColor"
          strokeWidth={0.5}
          className="text-zinc-700"
        />
      ))}

      {/* Data polygon */}
      <polygon
        points={dataPolygon}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}

      {/* Labels */}
      {skills.map((skill, i) => {
        const lp = axisPoints[i].label;
        const val = scores[skill.id] ?? 0;
        const angle = axisPoints[i].angle;
        const cos = Math.cos(angle);
        let textAnchor: 'start' | 'middle' | 'end' = 'middle';
        if (cos > 0.3) textAnchor = 'start';
        else if (cos < -0.3) textAnchor = 'end';

        const sin = Math.sin(angle);
        const dy = sin > 0.3 ? '1em' : sin < -0.3 ? '-0.2em' : '0.35em';
        const label = skill.name.length > maxLabelLen
          ? skill.name.slice(0, maxLabelLen) + '…'
          : skill.name;

        return (
          <text
            key={skill.id}
            x={lp.x}
            y={lp.y}
            textAnchor={textAnchor}
            dy={dy}
            className="fill-zinc-400"
            style={{ fontSize: size * 0.035 }}
          >
            {label}
            <tspan className="fill-zinc-500" dx={3} style={{ fontSize: size * 0.03 }}>
              {val > 0 ? val.toFixed(1) : '—'}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
