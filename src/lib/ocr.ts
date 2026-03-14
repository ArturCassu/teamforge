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
}

export interface OcrSkillsResult {
  skills: string[];
  rawText: string;
}

// ─── Shared worker creation ────────────────────────────────────
async function createOcrWorker(onProgress?: (progress: number) => void) {
  return Tesseract.createWorker('por', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
}

// ─── 1. Extract scores from filled form image ─────────────────
/**
 * Processa imagem do formulário preenchido e extrai nome + notas.
 * Recebe as skills da sala como parâmetro.
 */
export async function processFormImage(
  imageFile: File,
  skills: SkillRef[],
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  const worker = await createOcrWorker(onProgress);

  try {
    const { data } = await worker.recognize(imageFile);
    const rawText = data.text;
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

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

    const confidence = skills.length > 0 ? scores.length / skills.length : 0;

    return { name, scores, confidence, rawText, warnings };
  } finally {
    await worker.terminate();
  }
}

// ─── 2. Extract skill names from image (for room creation) ────
/**
 * Extrai nomes de skills de uma imagem (lista, quadro, post-its, etc).
 * Cada linha com 2+ caracteres alfa vira uma skill candidata.
 * Filtra ruído (números soltos, linhas muito curtas, headers genéricos).
 */
export async function extractSkillNames(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OcrSkillsResult> {
  const worker = await createOcrWorker(onProgress);

  try {
    const { data } = await worker.recognize(imageFile);
    const rawText = data.text;
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
      // Remove leading bullets, dashes, numbers (e.g. "1. ", "- ", "• ")
      let cleaned = line
        .replace(/^[\d\.\)\-•●○◦▪︎▸►→\s]+/, '')
        .replace(/\s*[:.\-]\s*\d+\s*$/, '')  // remove trailing ": 7" or "- 8"
        .replace(/\s*:\s*$/, '')              // remove trailing ":" (headers)
        .trim();

      // Must have >= 2 alpha chars
      const alphaCount = (cleaned.match(/[a-záàâãéèêíìóòôõúùûçñ]/gi) || []).length;
      if (alphaCount < 2) continue;

      // Skip noise
      const normalized = normalizeStr(cleaned);
      if (NOISE.has(normalized)) continue;

      // Skip if too long (probably a sentence, not a skill name)
      if (cleaned.length > 60) continue;

      // Deduplicate
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Capitalize first letter
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      skills.push(cleaned);
    }

    return { skills, rawText };
  } finally {
    await worker.terminate();
  }
}

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
