'use client';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

function getBadgeClasses(score: number): string {
  if (score <= 3) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (score <= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  if (score <= 8) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(10, Math.round(score)));

  const sizeClasses =
    size === 'sm'
      ? 'text-xs px-1.5 py-0.5 min-w-5'
      : 'text-sm px-2 py-0.5 min-w-7';

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold rounded-full tabular-nums ${sizeClasses} ${getBadgeClasses(clamped)}`}
    >
      {clamped}
    </span>
  );
}
