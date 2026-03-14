'use client';

import { CATEGORY_LABELS, type SkillCategory } from '@/lib/types';
import { SKILLS, getCategories } from '@/lib/skills';

interface RadarChartProps {
  scores: Record<string, number>;
  size?: number;
  color?: string;
}

function getCategoryAverage(
  category: SkillCategory,
  scores: Record<string, number>,
): number {
  const categorySkills = SKILLS.filter((s) => s.category === category);
  const values = categorySkills
    .map((s) => scores[s.id])
    .filter((v): v is number => v !== undefined && v > 0);

  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
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
  size = 300,
  color = '#3B82F6',
}: RadarChartProps) {
  const categories = getCategories();
  const count = categories.length; // 6
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.36;
  const labelRadius = size * 0.46;
  const startAngle = -Math.PI / 2; // top

  const rings = [0.25, 0.5, 0.75, 1];

  const axisPoints = categories.map((_, i) => {
    const angle = startAngle + (2 * Math.PI * i) / count;
    return {
      angle,
      outer: polarToCartesian(cx, cy, maxRadius, angle),
      label: polarToCartesian(cx, cy, labelRadius, angle),
    };
  });

  // Data polygon points
  const dataPoints = categories.map((cat, i) => {
    const avg = getCategoryAverage(cat, scores);
    const normalizedRadius = (avg / 10) * maxRadius;
    const angle = startAngle + (2 * Math.PI * i) / count;
    return polarToCartesian(cx, cy, normalizedRadius, angle);
  });

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="select-none"
    >
      {/* Grid rings */}
      {rings.map((scale) => {
        const ringPoints = categories.map((_, i) => {
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
            className="text-zinc-300 dark:text-zinc-700"
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
          className="text-zinc-300 dark:text-zinc-700"
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

      {/* Data points (dots) */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}

      {/* Axis labels */}
      {categories.map((cat, i) => {
        const lp = axisPoints[i].label;
        const avg = getCategoryAverage(cat, scores);

        // Text anchor based on position
        const angle = axisPoints[i].angle;
        const cos = Math.cos(angle);
        let textAnchor: 'start' | 'middle' | 'end' = 'middle';
        if (cos > 0.3) textAnchor = 'start';
        else if (cos < -0.3) textAnchor = 'end';

        const sin = Math.sin(angle);
        const dy = sin > 0.3 ? '1em' : sin < -0.3 ? '-0.2em' : '0.35em';

        return (
          <text
            key={cat}
            x={lp.x}
            y={lp.y}
            textAnchor={textAnchor}
            dy={dy}
            className="fill-zinc-600 dark:fill-zinc-400"
            style={{ fontSize: size * 0.037 }}
          >
            {CATEGORY_LABELS[cat]}
            <tspan
              className="fill-zinc-400 dark:fill-zinc-500"
              dx={4}
              style={{ fontSize: size * 0.032 }}
            >
              {avg > 0 ? avg.toFixed(1) : '—'}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
