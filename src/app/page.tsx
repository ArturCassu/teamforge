'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { AddPersonForm } from '@/components/sections/add-person-form';
import { OcrUpload } from '@/components/sections/ocr-upload';
import { PeopleList } from '@/components/sections/people-list';
import { TeamResults } from '@/components/sections/team-results';

type InputMode = 'manual' | 'ocr';
type ActiveTab = 'add' | 'people' | 'teams';

export default function Home() {
  const { people, teams } = useApp();
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [activeTab, setActiveTab] = useState<ActiveTab>('add');

  const tabs: { id: ActiveTab; label: string; emoji: string; count?: number }[] = [
    { id: 'add', label: 'Adicionar', emoji: '➕' },
    { id: 'people', label: 'Pessoas', emoji: '👥', count: people.length },
    { id: 'teams', label: 'Times', emoji: '⚡', count: teams.length },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Monte Times <span className="text-emerald-400">Complementares</span>
        </h2>
        <p className="mt-2 text-zinc-400">
          Adicione pessoas com suas soft skills e o algoritmo forma times equilibrados
        </p>
      </section>

      {/* Navigation Tabs */}
      <nav className="flex justify-center">
        <div className="inline-flex rounded-xl bg-zinc-900 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-zinc-700 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      {activeTab === 'add' && (
        <div className="space-y-6">
          {/* Input Mode Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg bg-zinc-900 p-1">
              <button
                onClick={() => setInputMode('manual')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  inputMode === 'manual'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📝 Manual
              </button>
              <button
                onClick={() => setInputMode('ocr')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  inputMode === 'ocr'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📷 OCR (Foto)
              </button>
            </div>
          </div>

          {inputMode === 'manual' ? <AddPersonForm /> : <OcrUpload />}
        </div>
      )}

      {activeTab === 'people' && <PeopleList />}

      {activeTab === 'teams' && <TeamResults />}
    </div>
  );
}
