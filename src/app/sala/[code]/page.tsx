'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import type { SkillScore } from '@/lib/types';
import type { RoomData, SkillData } from '@/lib/api';
import { getRoom, addPerson } from '@/lib/api';
import { processFormImage, type OcrResult } from '@/lib/ocr';

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

  // OCR state
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [showOcrReview, setShowOcrReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch room on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getRoom(code);
        if (cancelled) return;
        setRoom(data);

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
        addedVia: ocrResult ? 'ocr' : 'manual',
      });

      setPageState('submitted');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── OCR handlers ───────────────────────────────────────────
  const handleOcrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;

    setOcrProcessing(true);
    setOcrProgress(0);
    setErrorMsg('');

    try {
      const result = await processFormImage(
        file,
        room.skills.map((s) => ({ id: s.id, name: s.name })),
        (p) => setOcrProgress(p),
      );

      setOcrResult(result);

      // Apply extracted data
      if (result.name && !name.trim()) {
        setName(result.name);
      }

      if (result.scores.length > 0) {
        setScores((prev) => {
          const updated = { ...prev };
          for (const s of result.scores) {
            updated[s.skillId] = s.score;
          }
          return updated;
        });
      }

      setShowOcrReview(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro no OCR');
    } finally {
      setOcrProcessing(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── LOADING ────────────────────────────────────────────────
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

  // ─── ERROR ──────────────────────────────────────────────────
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

  // ─── LOCKED ─────────────────────────────────────────────────
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

  // ─── SUBMITTED ──────────────────────────────────────────────
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

  // ─── FORM ───────────────────────────────────────────────────
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">📝 Suas Skills</h2>

          {/* OCR button */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleOcrFile}
              className="hidden"
              id="ocr-file-input"
            />
            <button
              type="button"
              disabled={ocrProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                bg-amber-500/10 text-amber-400 border border-amber-500/20
                hover:bg-amber-500/20 transition-colors cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed"
              title="Escanear formulário preenchido"
            >
              📷 OCR
            </button>
          </div>
        </div>

        {/* OCR processing indicator */}
        {ocrProcessing && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processando imagem... {ocrProgress}%
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* OCR review banner */}
        {showOcrReview && ocrResult && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 text-sm font-medium">
                {ocrResult.aiEnhanced ? '🤖' : '📷'} OCR: {ocrResult.scores.length}/{roomSkills.length} skills detectadas
                ({Math.round(ocrResult.confidence * 100)}% confiança)
                {ocrResult.aiEnhanced && <span className="text-emerald-500/60 text-xs ml-1">AI</span>}
              </span>
              <button
                type="button"
                onClick={() => setShowOcrReview(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            {ocrResult.warnings.length > 0 && (
              <details className="text-xs text-zinc-500">
                <summary className="cursor-pointer hover:text-zinc-400">
                  ⚠️ {ocrResult.warnings.length} avisos
                </summary>
                <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                  {ocrResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </details>
            )}
            <p className="text-xs text-zinc-500">
              Revise os valores abaixo e ajuste se necessário antes de enviar.
            </p>
          </div>
        )}

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
                highlighted={ocrResult?.scores.some((s) => s.skillId === skill.id)}
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

// ─── SkillRow ─────────────────────────────────────────────────
function SkillRow({
  skill,
  value,
  onChange,
  highlighted,
}: {
  skill: SkillData;
  value: number;
  onChange: (v: number) => void;
  highlighted?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 group rounded-lg px-1 py-0.5 transition-colors
      ${highlighted ? 'bg-amber-500/5 ring-1 ring-amber-500/20' : ''}`}>
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
