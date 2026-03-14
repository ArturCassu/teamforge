'use client';

import type { SkillData } from '@/lib/api';

/** A single data series (one person or team average) */
interface DataSeries {
  label: string;
  scores: Record<string, number>;
  color: string;
}

interface RadarChartProps {
  /** Team average scores (backward compat — rendered as filled polygon) */
  scores?: Record<string, number>;
  /** Individual member series rendered as colored lines */
  members?: DataSeries[];
  skills: SkillData[];
  size?: number;
  color?: string;
}

// 8 distinguishable colors that work on dark backgrounds
const MEMBER_COLORS = [
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#14B8A6', // teal
  '#F97316', // orange
  '#06B6D4', // cyan
  '#EF4444', // red
];

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
  members,
  skills,
  size = 300,
  color = '#10B981',
}: RadarChartProps) {
  const count = skills.length;
  if (count < 3) return null;

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

  const maxLabelLen = count > 15 ? 6 : count > 8 ? 10 : 20;

  // Build polygon for a given scores map
  const buildPolygon = (s: Record<string, number>) =>
    skills.map((skill, i) => {
      const val = s[skill.id] ?? 0;
      const r = (val / 10) * maxRadius;
      const angle = startAngle + (2 * Math.PI * i) / count;
      return polarToCartesian(cx, cy, r, angle);
    });

  // Average scores (team-level)
  const avgScores = scores ?? {};
  const avgPoints = buildPolygon(avgScores);
  const avgPolygon = avgPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Member polygons
  const memberPolygons = (members ?? []).map((m, idx) => {
    const pts = buildPolygon(m.scores);
    return {
      ...m,
      color: m.color || MEMBER_COLORS[idx % MEMBER_COLORS.length],
      points: pts,
      polygon: pts.map((p) => `${p.x},${p.y}`).join(' '),
    };
  });

  const hasMembers = memberPolygons.length > 0;

  return (
    <div className="space-y-2">
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

        {/* Member polygons (individual lines) */}
        {memberPolygons.map((m, idx) => (
          <polygon
            key={idx}
            points={m.polygon}
            fill={m.color}
            fillOpacity={0.06}
            stroke={m.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeDasharray={hasMembers ? '4 2' : undefined}
          />
        ))}

        {/* Team average polygon (solid, on top) */}
        {scores && (
          <>
            <polygon
              points={avgPolygon}
              fill={color}
              fillOpacity={hasMembers ? 0.1 : 0.2}
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {avgPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={hasMembers ? 2.5 : 3} fill={color} />
            ))}
          </>
        )}

        {/* Labels */}
        {skills.map((skill, i) => {
          const lp = axisPoints[i].label;
          const val = avgScores[skill.id] ?? 0;
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

      {/* Legend (only when members are shown) */}
      {hasMembers && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center px-2">
          {memberPolygons.map((m, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-xs text-zinc-400 truncate max-w-24">
                {m.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-zinc-500 font-medium">Média</span>
          </div>
        </div>
      )}
    </div>
  );
}
