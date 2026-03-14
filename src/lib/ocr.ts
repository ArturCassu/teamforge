import Tesseract from 'tesseract.js';
import { SkillScore } from './types';

interface SkillRef {
  id: string;
  name: string;
}

interface OcrResult {
  name: string | null;
  scores: SkillScore[];
  confidence: number;
  rawText: string;
  warnings: string[];
}

/**
 * Processa imagem do formulário preenchido e extrai nome + notas.
 * Agora recebe as skills da sala como parâmetro (não hardcoded).
 */
export async function processFormImage(
  imageFile: File,
  skills: SkillRef[],
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  const worker = await Tesseract.createWorker('por', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

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
      const numbers = line.match(/\b(10|[1-9])\b/g);
      if (numbers && numbers.length > 0) {
        const score = parseInt(numbers[numbers.length - 1], 10);
        if (score >= 1 && score <= 10) return score;
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
