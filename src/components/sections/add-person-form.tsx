'use client';

import { useState, useCallback } from 'react';
import { useApp } from '@/lib/store';
import { SKILLS, getSkillsByCategory, getCategories } from '@/lib/skills';
import {
  type SkillCategory,
  type SkillScore,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_COLORS,
} from '@/lib/types';
import { SkillSlider } from '@/components/ui/skill-slider';

function buildDefaultScores(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const skill of SKILLS) {
    map[skill.id] = 5;
  }
  return map;
}

export function AddPersonForm() {
  const { addPerson } = useApp();
  const categories = getCategories();
  const [activeTab, setActiveTab] = useState<SkillCategory>(categories[0]);
  const [name, setName] = useState('');
  const [scores, setScores] = useState<Record<string, number>>(buildDefaultScores);

  const handleScoreChange = useCallback((skillId: string, value: number) => {
    setScores((prev) => ({ ...prev, [skillId]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const skillScores: SkillScore[] = SKILLS.map((s) => ({
      skillId: s.id,
      score: scores[s.id] ?? 5,
    }));

    addPerson({
      id: crypto.randomUUID(),
      name: trimmed,
      scores: skillScores,
      addedVia: 'manual',
      createdAt: Date.now(),
    });

    // Reset
    setName('');
    setScores(buildDefaultScores());
    setActiveTab(categories[0]);
  };

  const categorySkills = getSkillsByCategory(activeTab);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6"
    >
      <h2 className="text-lg font-semibold text-white">Adicionar Pessoa</h2>

      {/* Name input */}
      <div>
        <label htmlFor="person-name" className="block text-sm text-zinc-400 mb-1.5">
          Nome
        </label>
        <input
          id="person-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: João Silva"
          className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white
            placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50
            focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const isActive = activeTab === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800'
                }
              `}
              style={isActive ? { backgroundColor: CATEGORY_COLORS[cat] + '22', color: CATEGORY_COLORS[cat] } : undefined}
            >
              {CATEGORY_EMOJIS[cat]} {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* Skill sliders for active category */}
      <div className="space-y-3 bg-zinc-800/40 rounded-xl p-4 border border-zinc-800">
        {categorySkills.map((skill) => (
          <SkillSlider
            key={skill.id}
            skill={skill}
            value={scores[skill.id] ?? 5}
            onChange={(val) => handleScoreChange(skill.id, val)}
          />
        ))}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!name.trim()}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700
          disabled:text-zinc-500 text-white font-medium transition-colors cursor-pointer
          disabled:cursor-not-allowed"
      >
        Adicionar Pessoa
      </button>
    </form>
  );
}
