'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { SkillScore } from '@/lib/types';
import type { RoomData, SkillData } from '@/lib/api';
import { getRoom, addPerson } from '@/lib/api';

type PageState = 'loading' | 'form' | 'submitted' | 'locked' | 'error';

export default function ParticipantPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  // Page state
  const [pageState, setPageState] = useState<PageState>('loading');
  const [room, setRoom] = useState<RoomData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch room on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getRoom(code);
        if (cancelled) return;
        setRoom(data);

        // Initialize scores for this room's skills (default 5)
        const defaultScores: Record<string, number> = {};
        for (const skill of data.skills) {
          defaultScores[skill.id] = 5;
        }
        setScores(defaultScores);

        if (data.status === 'LOCKED' || data.status === 'DONE') {
          setPageState('locked');
        } else {
          setPageState('form');
        }
      } catch {
        if (cancelled) return;
        setErrorMsg('Sala não encontrada. Verifique o código e tente novamente.');
        setPageState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const handleScoreChange = useCallback((skillId: string, value: number) => {
    setScores((prev) => ({ ...prev, [skillId]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !room) return;

    setSubmitting(true);
    try {
      const skillScores: SkillScore[] = room.skills.map((s) => ({
        skillId: s.id,
        score: scores[s.id] ?? 5,
      }));

      await addPerson(code, {
        name: trimmed,
        scores: skillScores,
        addedVia: 'manual',
      });

      setPageState('submitted');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── LOADING ────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
        <svg className="animate-spin h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-zinc-400">Carregando sala...</p>
      </div>
    );
  }

  // ─── ERROR ──────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
        <span className="text-5xl">😕</span>
        <p className="text-zinc-300 font-medium text-lg">{errorMsg}</p>
        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
          ← Voltar para o início
        </a>
      </div>
    );
  }

  // ─── LOCKED ─────────────────────────────────────────────────────
  if (pageState === 'locked') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
        <span className="text-5xl">🔒</span>
        <h2 className="text-xl font-semibold text-white">Sala Fechada</h2>
        <p className="text-zinc-400 text-center max-w-md">
          Esta sala não aceita mais participantes. Os times já estão sendo formados.
        </p>
        {room && (
          <div className="mt-2 rounded-xl bg-zinc-900 border border-zinc-800 px-6 py-3 text-center">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Sala</p>
            <p className="text-white font-semibold text-lg">{room.name}</p>
          </div>
        )}
      </div>
    );
  }

  // ─── SUBMITTED ──────────────────────────────────────────────────
  if (pageState === 'submitted') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 animate-fade-in">
        <span className="text-6xl">✅</span>
        <h2 className="text-2xl font-bold text-white">Skills Enviadas!</h2>
        <p className="text-zinc-400 text-center max-w-md">
          Suas soft skills foram registradas com sucesso. Aguarde o organizador montar os times.
        </p>
        {room && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-6 py-4 text-center space-y-1">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Sala</p>
            <p className="text-white font-semibold">{room.name}</p>
            <p className="font-mono text-emerald-400 text-lg tracking-widest">{room.code}</p>
          </div>
        )}
      </div>
    );
  }

  // ─── FORM ───────────────────────────────────────────────────────
  const roomSkills = room?.skills ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Room header */}
      {room && (
        <div className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 px-5 py-3">
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Sala</p>
            <p className="text-white font-semibold">{room.name}</p>
          </div>
          <span className="font-mono text-emerald-400 text-lg tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg">
            {room.code}
          </span>
        </div>
      )}

      {/* Skill form */}
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6"
      >
        <h2 className="text-lg font-semibold text-white">📝 Suas Skills</h2>

        {/* Name */}
        <div>
          <label htmlFor="participant-name" className="block text-sm text-zinc-400 mb-1.5">
            Seu nome
          </label>
          <input
            id="participant-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white
              placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50
              focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Skills list — flat, no categories */}
        <div className="space-y-2">
          <p className="text-sm text-zinc-400 font-medium">
            Avalie cada skill de 0 a 10
          </p>
          <div className="space-y-2 bg-zinc-800/40 rounded-xl p-4 border border-zinc-800 max-h-[60vh] overflow-y-auto">
            {roomSkills.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                value={scores[skill.id] ?? 5}
                onChange={(val) => handleScoreChange(skill.id, val)}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500
            disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold text-lg
            transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Enviando...
            </span>
          ) : (
            'Enviar Skills'
          )}
        </button>
      </form>
    </div>
  );
}

// ─── SkillRow ─────────────────────────────────────────────────────
function SkillRow({
  skill,
  value,
  onChange,
}: {
  skill: SkillData;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 group">
      <label
        htmlFor={`skill-${skill.id}`}
        className="text-sm text-zinc-300 w-44 shrink-0 truncate cursor-pointer"
        title={skill.name}
      >
        {skill.name}
      </label>
      <input
        id={`skill-${skill.id}`}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 appearance-none rounded-full bg-zinc-700 cursor-pointer accent-emerald-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500
          [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
          [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab"
      />
      <span className="text-sm font-semibold tabular-nums w-6 text-center shrink-0 text-emerald-400">
        {value}
      </span>
    </div>
  );
}
