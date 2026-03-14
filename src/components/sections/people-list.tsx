'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { SKILLS } from '@/lib/skills';
import {
  type SkillCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_EMOJIS,
} from '@/lib/types';
import { ScoreBadge } from '@/components/ui/score-badge';

function getScoreValue(scores: { skillId: string; score: number }[], skillId: string): number {
  return scores.find((s) => s.skillId === skillId)?.score ?? 5;
}

function getStrongestCategory(
  scores: { skillId: string; score: number }[],
): SkillCategory {
  const categoryAvgs: Partial<Record<SkillCategory, number>> = {};

  for (const skill of SKILLS) {
    const val = getScoreValue(scores, skill.id);
    if (!categoryAvgs[skill.category]) categoryAvgs[skill.category] = 0;
    categoryAvgs[skill.category]! += val;
  }

  // Average per category (5 skills each)
  let best: SkillCategory = 'comunicacao';
  let bestAvg = 0;
  for (const [cat, total] of Object.entries(categoryAvgs)) {
    const avg = (total as number) / 5;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = cat as SkillCategory;
    }
  }

  return best;
}

export function PeopleList() {
  const { people, removePerson } = useApp();

  const enrichedPeople = useMemo(
    () =>
      people.map((person) => {
        const sorted = [...person.scores].sort((a, b) => b.score - a.score);
        const strengths = sorted.slice(0, 3).map((s) => ({
          ...s,
          skill: SKILLS.find((sk) => sk.id === s.skillId)!,
        }));
        const weaknesses = sorted.slice(-3).reverse().map((s) => ({
          ...s,
          skill: SKILLS.find((sk) => sk.id === s.skillId)!,
        }));
        const strongestCat = getStrongestCategory(person.scores);
        return { ...person, strengths, weaknesses, strongestCat };
      }),
    [people],
  );

  if (people.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-zinc-400 font-medium">Nenhuma pessoa adicionada ainda</p>
        <p className="text-zinc-500 text-sm mt-1">
          Adicione pessoas manualmente ou via OCR acima
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Pessoas{' '}
          <span className="text-zinc-500 font-normal text-sm">({people.length})</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {enrichedPeople.map((person) => (
          <div
            key={person.id}
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 relative group
              hover:border-zinc-700 transition-colors"
          >
            {/* Delete button */}
            <button
              type="button"
              onClick={() => removePerson(person.id)}
              className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-900/60
                text-zinc-500 hover:text-red-300 flex items-center justify-center transition-colors
                opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Remover pessoa"
            >
              ✕
            </button>

            {/* Header: name + badge + category dot */}
            <div className="flex items-center gap-2 mb-3 pr-8">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[person.strongestCat] }}
                title={`Forte em ${CATEGORY_LABELS[person.strongestCat]}`}
              />
              <h3 className="text-white font-medium truncate">{person.name}</h3>
              <span className="text-xs text-zinc-500 shrink-0">
                {person.addedVia === 'manual' ? '📝' : '📷'}
              </span>
            </div>

            {/* Strengths */}
            <div className="mb-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Forças</p>
              <div className="flex flex-wrap gap-1.5">
                {person.strengths.map(({ skill, score }) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1 text-xs bg-emerald-900/30 text-emerald-300
                      rounded-lg px-2 py-0.5"
                  >
                    {skill.name}
                    <ScoreBadge score={score} size="sm" />
                  </span>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                A desenvolver
              </p>
              <div className="flex flex-wrap gap-1.5">
                {person.weaknesses.map(({ skill, score }) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1 text-xs bg-red-900/20 text-red-300/80
                      rounded-lg px-2 py-0.5"
                  >
                    {skill.name}
                    <ScoreBadge score={score} size="sm" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
