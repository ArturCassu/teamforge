import Tesseract from 'tesseract.js';
import { SkillScore } from './types';

interface SkillRef {
  id: string;
  name: string;
}

export interface OcrResult {
  name: string | null;
  scores: SkillScore[];
  confidence: number;
  rawText: string;
  warnings: string[];
  aiEnhanced: boolean;
}

export interface OcrSkillsResult {
  skills: string[];
  rawText: string;
  aiEnhanced: boolean;
}

// ─── Tesseract worker ─────────────────────────────────────────
async function createOcrWorker(onProgress?: (progress: number) => void) {
  return Tesseract.createWorker('por', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        // Reserve 0-80% for Tesseract, 80-100% for AI refinement
        onProgress(Math.round(m.progress * 80));
      }
    },
  });
}

async function extractText(
  imageFile: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const worker = await createOcrWorker(onProgress);
  try {
    const { data } = await worker.recognize(imageFile);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

// ─── AI refinement (calls /api/ocr) ──────────────────────────
interface AiScoresResponse {
  name: string | null;
  scores: { skillId: string; skillName: string; score: number }[];
  unmatched: string[];
}

interface AiSkillsResponse {
  skills: string[];
}

async function aiParseScores(
  rawText: string,
  skills: SkillRef[],
): Promise<AiScoresResponse | null> {
  try {
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'scores', rawText, skills }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function aiParseSkillNames(
  rawText: string,
): Promise<AiSkillsResponse | null> {
  try {
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'skills', rawText }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── 1. Extract scores from filled form ───────────────────────
export async function processFormImage(
  imageFile: File,
  skills: SkillRef[],
  onProgress?: (progress: number) => void,
): Promise<OcrResult> {
  // Phase 1: Tesseract (0-80%)
  const rawText = await extractText(imageFile, onProgress);
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  onProgress?.(85);

  // Phase 2: Try AI refinement (80-100%)
  const aiResult = await aiParseScores(rawText, skills);

  if (aiResult && aiResult.scores.length > 0) {
    onProgress?.(100);

    const scores: SkillScore[] = aiResult.scores
      .filter((s) => s.score >= 0 && s.score <= 10)
      .map((s) => ({ skillId: s.skillId, score: Math.round(s.score) }));

    const warnings = (aiResult.unmatched ?? []).map(
      (name: string) => `Não encontrei nota para "${name}"`,
    );

    return {
      name: aiResult.name ?? null,
      scores,
      confidence: skills.length > 0 ? scores.length / skills.length : 0,
      rawText,
      warnings,
      aiEnhanced: true,
    };
  }

  // Phase 3: Fallback — regex parsing
  onProgress?.(90);

  const warnings: string[] = [];
  const scores: SkillScore[] = [];
  const name = extractName(lines);

  for (const skill of skills) {
    const result = findSkillScore(lines, skill.name);
    if (result !== null) {
      scores.push({ skillId: skill.id, score: result });
    } else {
      warnings.push(`Não encontrei nota para "${skill.name}"`);
    }
  }

  onProgress?.(100);

  return {
    name,
    scores,
    confidence: skills.length > 0 ? scores.length / skills.length : 0,
    rawText,
    warnings,
    aiEnhanced: false,
  };
}

// ─── 2. Extract skill names from image ────────────────────────
export async function extractSkillNames(
  imageFile: File,
  onProgress?: (progress: number) => void,
): Promise<OcrSkillsResult> {
  // Phase 1: Tesseract (0-80%)
  const rawText = await extractText(imageFile, onProgress);

  onProgress?.(85);

  // Phase 2: Try AI refinement
  const aiResult = await aiParseSkillNames(rawText);

  if (aiResult && aiResult.skills.length > 0) {
    onProgress?.(100);
    return { skills: aiResult.skills, rawText, aiEnhanced: true };
  }

  // Phase 3: Fallback — regex parsing
  onProgress?.(90);

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  const NOISE = new Set([
    'skills', 'skill', 'nome', 'name', 'nota', 'notas', 'score', 'scores',
    'avaliacao', 'avaliação', 'formulario', 'formulário', 'soft skills',
    'competencias', 'competências', 'habilidades',
    'skills do time', 'skills do grupo', 'skills da sala',
    'lista de skills', 'lista de competencias', 'lista',
  ]);

  const skills: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    let cleaned = line
      .replace(/^[\d\.\)\-•●○◦▪︎▸►→\s]+/, '')
      .replace(/\s*[:.\-]\s*\d+\s*$/, '')
      .replace(/\s*:\s*$/, '')
      .trim();

    const alphaCount = (cleaned.match(/[a-záàâãéèêíìóòôõúùûçñ]/gi) || []).length;
    if (alphaCount < 2) continue;

    const normalized = normalizeStr(cleaned);
    if (NOISE.has(normalized)) continue;
    if (cleaned.length > 60) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    skills.push(cleaned);
  }

  onProgress?.(100);

  return { skills, rawText, aiEnhanced: false };
}

// ─── Regex helpers (fallback) ─────────────────────────────────
function extractName(lines: string[]): string | null {
  for (const line of lines.slice(0, 5)) {
    const nameMatch = line.match(/nome\s*[:.\-]\s*(.+)/i);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      if (name.length >= 2) return name;
    }
  }
  return null;
}

function findSkillScore(lines: string[], skillName: string): number | null {
  const normalized = normalizeStr(skillName);

  for (const line of lines) {
    const normalizedLine = normalizeStr(line);

    if (normalizedLine.includes(normalized) || fuzzyMatch(normalizedLine, normalized)) {
      const numbers = line.match(/\b(10|[0-9])\b/g);
      if (numbers && numbers.length > 0) {
        const score = parseInt(numbers[numbers.length - 1], 10);
        if (score >= 0 && score <= 10) return score;
      }
    }
  }

  return null;
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function fuzzyMatch(haystack: string, needle: string): boolean {
  const words = needle.split(/\s+/);
  if (words.length <= 1) return false;
  const matches = words.filter((w) => haystack.includes(w));
  return matches.length / words.length >= 0.7;
}
