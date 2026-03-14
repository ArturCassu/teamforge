'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SKILLS, getSkillsByCategory, getCategories } from '@/lib/skills';
import {
  type SkillCategory,
  type SkillScore,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_COLORS,
} from '@/lib/types';
import { SkillSlider } from '@/components/ui/skill-slider';
import { getRoom, addPerson, type RoomData } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PageState = 'loading' | 'form' | 'submitted' | 'locked' | 'error';
type InputMode = 'manual' | 'ocr';

function buildDefaultScores(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const skill of SKILLS) map[skill.id] = 5;
  return map;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ParticipantPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const categories = getCategories();

  // Page state
  const [pageState, setPageState] = useState<PageState>('loading');
  const [room, setRoom] = useState<RoomData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [name, setName] = useState('');
  const [scores, setScores] = useState<Record<string, number>>(buildDefaultScores);
  const [activeTab, setActiveTab] = useState<SkillCategory>(categories[0]);
  const [submitting, setSubmitting] = useState(false);

  // OCR state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrStage, setOcrStage] = useState<'idle' | 'processing' | 'review' | 'error'>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState('');
  const [ocrMeta, setOcrMeta] = useState<{ confidence: number; warnings: string[] }>({
    confidence: 0,
    warnings: [],
  });
  const [isDragging, setIsDragging] = useState(false);

  // Fetch room on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getRoom(code);
        if (cancelled) return;
        setRoom(data);
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

  // Score change handler
  const handleScoreChange = useCallback((skillId: string, value: number) => {
    setScores((prev) => ({ ...prev, [skillId]: value }));
  }, []);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const skillScores: SkillScore[] = SKILLS.map((s) => ({
        skillId: s.id,
        score: scores[s.id] ?? 5,
      }));

      await addPerson(code, {
        name: trimmed,
        scores: skillScores,
        addedVia: inputMode === 'ocr' ? 'ocr' : 'manual',
      });

      setPageState('submitted');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setSubmitting(false);
    }
  };

  // OCR handlers
  const processFile = useCallback(async (file: File) => {
    setOcrStage('processing');
    setOcrProgress(0);
    setOcrError('');

    try {
      const { processFormImage } = await import('@/lib/ocr');
      const result = await processFormImage(file, (p: number) => setOcrProgress(p));

      const scoresMap: Record<string, number> = {};
      for (const skill of SKILLS) {
        const found = result.scores.find((s: SkillScore) => s.skillId === skill.id);
        scoresMap[skill.id] = found?.score ?? 5;
      }

      setName(result.name ?? '');
      setScores(scoresMap);
      setOcrMeta({ confidence: result.confidence, warnings: result.warnings });
      setOcrStage('review');
    } catch (err) {
      console.error('OCR error:', err);
      setOcrError(
        err instanceof Error
          ? err.message
          : 'Erro ao processar imagem. Tente novamente.',
      );
      setOcrStage('error');
    }
  }, []);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|heic|webp)$/i)) {
      setOcrError('Formato não suportado. Use JPG, PNG, HEIC ou WebP.');
      setOcrStage('error');
      return;
    }
    processFile(file);
  };

  const handleOcrReset = () => {
    setOcrStage('idle');
    setOcrProgress(0);
    setOcrError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const categorySkills = getSkillsByCategory(activeTab);

  // ─── LOADING ────────────────────────────────────────────────────────
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

  // ─── ERROR ──────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
        <span className="text-5xl">😕</span>
        <p className="text-zinc-300 font-medium text-lg">{errorMsg}</p>
        <a
          href="/"
          className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
        >
          ← Voltar para o início
        </a>
      </div>
    );
  }

  // ─── LOCKED ─────────────────────────────────────────────────────────
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
        <a
          href="/"
          className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors mt-4"
        >
          ← Voltar para o início
        </a>
      </div>
    );
  }

  // ─── SUBMITTED ──────────────────────────────────────────────────────
  if (pageState === 'submitted') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 animate-fade-in">
        <div className="relative">
          <span className="text-6xl">✅</span>
        </div>
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

  // ─── FORM ───────────────────────────────────────────────────────────
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

      {/* Input mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-zinc-900 p-1 border border-zinc-800">
          <button
            type="button"
            onClick={() => { setInputMode('manual'); handleOcrReset(); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              inputMode === 'manual'
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📝 Manual
          </button>
          <button
            type="button"
            onClick={() => setInputMode('ocr')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              inputMode === 'ocr'
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📷 OCR (Foto)
          </button>
        </div>
      </div>

      {/* OCR Upload Area */}
      {inputMode === 'ocr' && ocrStage === 'idle' && (
        <div
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/webp,.jpg,.jpeg,.png,.heic,.webp"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <div className="text-4xl mb-3">📸</div>
          <p className="text-zinc-300 font-medium">
            Arraste uma foto do formulário ou clique para selecionar
          </p>
          <p className="text-zinc-500 text-sm mt-1">JPG, PNG, HEIC ou WebP</p>
        </div>
      )}

      {/* OCR Processing */}
      {inputMode === 'ocr' && ocrStage === 'processing' && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <div className="text-center">
            <div className="text-3xl mb-3 animate-pulse">🔍</div>
            <p className="text-zinc-300 font-medium">Processando imagem...</p>
            <p className="text-zinc-500 text-sm mt-1">Extraindo texto com OCR</p>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
          <p className="text-center text-sm text-zinc-400 tabular-nums">{ocrProgress}%</p>
        </div>
      )}

      {/* OCR Error */}
      {inputMode === 'ocr' && ocrStage === 'error' && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">😕</div>
            <p className="text-red-300 font-medium">Ops, algo deu errado</p>
            <p className="text-red-400/70 text-sm mt-1">{ocrError}</p>
          </div>
          <button
            type="button"
            onClick={handleOcrReset}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white
              font-medium transition-colors cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* OCR Review Confidence Banner */}
      {inputMode === 'ocr' && ocrStage === 'review' && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${
                ocrMeta.confidence >= 0.8
                  ? 'bg-green-900/40 text-green-300'
                  : ocrMeta.confidence >= 0.5
                    ? 'bg-amber-900/40 text-amber-300'
                    : 'bg-red-900/40 text-red-300'
              }`}
            >
              Confiança: {Math.round(ocrMeta.confidence * 100)}%
            </span>
            {ocrMeta.warnings.length > 0 && (
              <span className="text-sm text-amber-400">
                ⚠ {ocrMeta.warnings.length} alerta{ocrMeta.warnings.length > 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={handleOcrReset}
              className="ml-auto text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              ✕ Recomeçar
            </button>
          </div>
          {ocrMeta.warnings.length > 0 && (
            <details className="mt-2 group">
              <summary className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors">
                Ver alertas
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-amber-400/80 pl-4">
                {ocrMeta.warnings.map((w, i) => (
                  <li key={i} className="list-disc">{w}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Manual form (or OCR review form) */}
      {(inputMode === 'manual' || (inputMode === 'ocr' && ocrStage === 'review')) && (
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6"
        >
          <h2 className="text-lg font-semibold text-white">
            {inputMode === 'ocr' ? '📷 Revise e confirme' : '📝 Suas Soft Skills'}
          </h2>

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

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const isActive = activeTab === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveTab(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: CATEGORY_COLORS[cat] + '22', color: CATEGORY_COLORS[cat] }
                      : undefined
                  }
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

          {/* Progress indicator */}
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>Categorias:</span>
            <div className="flex gap-1">
              {categories.map((cat) => {
                const catSkills = getSkillsByCategory(cat);
                const filled = catSkills.some((s) => scores[s.id] !== 5);
                return (
                  <div
                    key={cat}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      filled ? 'opacity-100' : 'opacity-30'
                    }`}
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                    title={CATEGORY_LABELS[cat]}
                  />
                );
              })}
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <p className="text-red-400 text-sm">{errorMsg}</p>
          )}

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
      )}
    </div>
  );
}
