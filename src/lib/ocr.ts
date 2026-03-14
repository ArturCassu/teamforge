import Tesseract from 'tesseract.js';
import { SkillScore } from './types';
import { SKILLS } from './skills';

interface OcrResult {
  name: string | null;
  scores: SkillScore[];
  confidence: number;
  rawText: string;
  warnings: string[];
}

/**
 * Processa imagem do formulário preenchido e extrai nome + notas.
 *
 * O formulário esperado tem formato:
 *   Nome: ___________
 *   Escuta Ativa ......... [7]
 *   Oratória ............. [5]
 *   etc.
 *
 * O OCR tenta encontrar cada skill pelo nome e extrair o número à direita.
 */
export async function processFormImage(
  imageFile: File,
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

    // Try to extract name
    const name = extractName(lines);

    // Try to extract scores for each skill
    for (const skill of SKILLS) {
      const result = findSkillScore(lines, skill.name);
      if (result !== null) {
        scores.push({ skillId: skill.id, score: result });
      } else {
        warnings.push(`Não encontrei nota para "${skill.name}"`);
      }
    }

    const confidence = scores.length / SKILLS.length;

    return { name, scores, confidence, rawText, warnings };
  } finally {
    await worker.terminate();
  }
}

function extractName(lines: string[]): string | null {
  for (const line of lines.slice(0, 5)) {
    // "Nome: João Silva" or "NOME: ..."
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

    // Check if line contains the skill name
    if (normalizedLine.includes(normalized) || fuzzyMatch(normalizedLine, normalized)) {
      // Extract number from the line (prefer last number found)
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
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function fuzzyMatch(haystack: string, needle: string): boolean {
  const words = needle.split(/\s+/);
  if (words.length <= 1) return false;

  // At least 70% of words match
  const matches = words.filter((w) => haystack.includes(w));
  return matches.length / words.length >= 0.7;
}

/**
 * Gera um formulário em formato texto para impressão
 */
export function generatePrintableForm(): string {
  let form = `
╔══════════════════════════════════════════════════════════════╗
║                    TEAMFORGE — FORMULÁRIO                    ║
║              Avaliação de Soft Skills (1 a 10)               ║
╚══════════════════════════════════════════════════════════════╝

Nome: _______________________________________________

Instruções: Para cada habilidade, escreva sua nota de 1 a 10
no espaço entre colchetes. Seja honesto(a)!

`;

  const categories = [...new Set(SKILLS.map((s) => s.category))];
  const categoryLabels: Record<string, string> = {
    comunicacao: '💬 COMUNICAÇÃO',
    lideranca: '👑 LIDERANÇA',
    colaboracao: '🤝 COLABORAÇÃO',
    pensamento: '🧠 PENSAMENTO',
    gestao_pessoal: '🧘 GESTÃO PESSOAL',
    execucao: '🚀 EXECUÇÃO',
  };

  for (const cat of categories) {
    form += `──────────────────────────────────────────\n`;
    form += `  ${categoryLabels[cat]}\n`;
    form += `──────────────────────────────────────────\n`;

    const skills = SKILLS.filter((s) => s.category === cat);
    for (const skill of skills) {
      const padding = '.'.repeat(Math.max(2, 35 - skill.name.length));
      form += `  ${skill.name} ${padding} [   ]\n`;
    }
    form += '\n';
  }

  return form;
}
