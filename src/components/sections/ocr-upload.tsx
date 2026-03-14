'use client';

import { useState, useCallback, useRef } from 'react';
import { useApp } from '@/lib/store';
import { SKILLS, getSkillsByCategory, getCategories } from '@/lib/skills';
import {
  type SkillScore,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_COLORS,
} from '@/lib/types';
import { generatePrintableForm } from '@/lib/ocr';
import { SkillSlider } from '@/components/ui/skill-slider';

type OcrStage = 'idle' | 'uploading' | 'processing' | 'review' | 'error';

interface OcrResultData {
  name: string | null;
  scores: SkillScore[];
  confidence: number;
  warnings: string[];
}

export function OcrUpload() {
  const { addPerson } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = getCategories();

  const [stage, setStage] = useState<OcrStage>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Review state
  const [reviewName, setReviewName] = useState('');
  const [reviewScores, setReviewScores] = useState<Record<string, number>>({});
  const [ocrMeta, setOcrMeta] = useState<{ confidence: number; warnings: string[] }>({
    confidence: 0,
    warnings: [],
  });

  const processFile = useCallback(async (file: File) => {
    setStage('processing');
    setProgress(0);
    setErrorMsg('');

    try {
      // Dynamic import to avoid SSR issues with tesseract.js
      const { processFormImage } = await import('@/lib/ocr');
      const result: OcrResultData = await processFormImage(file, (p) => setProgress(p));

      // Build scores map — fill missing with default 5
      const scoresMap: Record<string, number> = {};
      for (const skill of SKILLS) {
        const found = result.scores.find((s) => s.skillId === skill.id);
        scoresMap[skill.id] = found?.score ?? 5;
      }

      setReviewName(result.name ?? '');
      setReviewScores(scoresMap);
      setOcrMeta({ confidence: result.confidence, warnings: result.warnings });
      setStage('review');
    } catch (err) {
      console.error('OCR error:', err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Erro ao processar imagem. Tente novamente ou adicione manualmente.',
      );
      setStage('error');
    }
  }, []);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|heic|webp)$/i)) {
      setErrorMsg('Formato não suportado. Use JPG, PNG, HEIC ou WebP.');
      setStage('error');
      return;
    }

    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleConfirm = () => {
    const trimmed = reviewName.trim();
    if (!trimmed) return;

    const skillScores: SkillScore[] = SKILLS.map((s) => ({
      skillId: s.id,
      score: reviewScores[s.id] ?? 5,
    }));

    addPerson({
      id: crypto.randomUUID(),
      name: trimmed,
      scores: skillScores,
      addedVia: 'ocr',
      createdAt: Date.now(),
    });

    // Reset
    setStage('idle');
    setReviewName('');
    setReviewScores({});
    setOcrMeta({ confidence: 0, warnings: [] });
    setProgress(0);
  };

  const handleDownloadForm = () => {
    const text = generatePrintableForm();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teamforge-formulario.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStage('idle');
    setProgress(0);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">📷 Upload via OCR</h2>
        <button
          type="button"
          onClick={handleDownloadForm}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
        >
          📄 Baixar Formulário
        </button>
      </div>

      {/* Idle: drop zone */}
      {stage === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
            transition-colors duration-200
            ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/40'
            }
          `}
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

      {/* Processing: progress bar */}
      {stage === 'processing' && (
        <div className="space-y-4 py-6">
          <div className="text-center">
            <div className="text-3xl mb-3 animate-pulse">🔍</div>
            <p className="text-zinc-300 font-medium">Processando imagem...</p>
            <p className="text-zinc-500 text-sm mt-1">Extraindo texto com OCR</p>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-zinc-400 tabular-nums">{progress}%</p>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">😕</div>
            <p className="text-red-300 font-medium">Ops, algo deu errado</p>
            <p className="text-red-400/70 text-sm mt-1">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white
              font-medium transition-colors cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Review: edit extracted data */}
      {stage === 'review' && (
        <div className="space-y-5">
          {/* Confidence & warnings */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`
                text-sm font-medium px-3 py-1 rounded-full
                ${
                  ocrMeta.confidence >= 0.8
                    ? 'bg-green-900/40 text-green-300'
                    : ocrMeta.confidence >= 0.5
                      ? 'bg-amber-900/40 text-amber-300'
                      : 'bg-red-900/40 text-red-300'
                }
              `}
            >
              Confiança: {Math.round(ocrMeta.confidence * 100)}%
            </span>
            {ocrMeta.warnings.length > 0 && (
              <span className="text-sm text-amber-400">
                ⚠ {ocrMeta.warnings.length} alerta{ocrMeta.warnings.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Warnings list */}
          {ocrMeta.warnings.length > 0 && (
            <details className="group">
              <summary className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors">
                Ver alertas ({ocrMeta.warnings.length})
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-amber-400/80 pl-4">
                {ocrMeta.warnings.map((w, i) => (
                  <li key={i} className="list-disc">
                    {w}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Name */}
          <div>
            <label htmlFor="ocr-name" className="block text-sm text-zinc-400 mb-1.5">
              Nome (extraído)
            </label>
            <input
              id="ocr-name"
              type="text"
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
              placeholder="Nome da pessoa"
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white
                placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Scores by category (all expanded) */}
          <div className="space-y-4">
            {categories.map((cat) => {
              const skills = getSkillsByCategory(cat);
              return (
                <div key={cat} className="space-y-2">
                  <h3 className="text-sm font-medium" style={{ color: CATEGORY_COLORS[cat] }}>
                    {CATEGORY_EMOJIS[cat]} {CATEGORY_LABELS[cat]}
                  </h3>
                  <div className="space-y-2 bg-zinc-800/40 rounded-xl p-3 border border-zinc-800">
                    {skills.map((skill) => (
                      <SkillSlider
                        key={skill.id}
                        skill={skill}
                        value={reviewScores[skill.id] ?? 5}
                        onChange={(val) =>
                          setReviewScores((prev) => ({ ...prev, [skill.id]: val }))
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white
                font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!reviewName.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500
                disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium
                transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Confirmar e Adicionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
