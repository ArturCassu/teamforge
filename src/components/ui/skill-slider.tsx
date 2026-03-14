'use client';

import type { Skill } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

interface SkillSliderProps {
  skill: Skill;
  value: number;
  onChange: (score: number) => void;
}

export function SkillSlider({ skill, value, onChange }: SkillSliderProps) {
  const accentColor = CATEGORY_COLORS[skill.category];

  return (
    <div className="flex items-center gap-3 group">
      <label
        htmlFor={`skill-${skill.id}`}
        className="text-sm text-zinc-700 dark:text-zinc-300 w-44 shrink-0 truncate cursor-pointer"
        title={skill.name}
      >
        {skill.name}
      </label>

      <input
        id={`skill-${skill.id}`}
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 appearance-none rounded-full bg-zinc-200 dark:bg-zinc-700 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-sm
          [&::-webkit-slider-thumb]:cursor-grab
          [&::-webkit-slider-thumb]:active:cursor-grabbing
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-125
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:shadow-sm
          [&::-moz-range-thumb]:cursor-grab
          [&::-moz-range-thumb]:active:cursor-grabbing"
        style={{
          accentColor,
          // Webkit thumb color
          ['--tw-slider-thumb-bg' as string]: accentColor,
        }}
        // Inline style for thumb bg (CSS custom property fallback via style tag)
      />

      <span
        className="text-sm font-semibold tabular-nums w-6 text-center shrink-0 transition-colors"
        style={{ color: accentColor }}
      >
        {value}
      </span>

      {/* Scoped style for thumb background color with the accent */}
      <style>{`
        #skill-${skill.id}::-webkit-slider-thumb {
          background-color: ${accentColor};
        }
        #skill-${skill.id}::-moz-range-thumb {
          background-color: ${accentColor};
        }
      `}</style>
    </div>
  );
}
