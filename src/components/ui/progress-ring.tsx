'use client';

interface ProgressRingProps {
  value: number; // 0-100
  label: string;
  color?: string;
  size?: number;
}

export function ProgressRing({
  value,
  label,
  color = '#3B82F6',
  size = 80,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="select-none -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-200 dark:text-zinc-800"
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />

        {/* Center text — counter-rotate so it's readable */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-zinc-800 dark:fill-zinc-200 rotate-90 origin-center"
          style={{
            fontSize: size * 0.28,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(clamped)}
        </text>
      </svg>

      <span
        className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-tight"
        style={{ maxWidth: size }}
      >
        {label}
      </span>
    </div>
  );
}
