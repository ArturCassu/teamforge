export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

export type SkillCategory =
  | 'comunicacao'
  | 'lideranca'
  | 'colaboracao'
  | 'pensamento'
  | 'gestao_pessoal'
  | 'execucao';

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  comunicacao: 'Comunicação',
  lideranca: 'Liderança',
  colaboracao: 'Colaboração',
  pensamento: 'Pensamento',
  gestao_pessoal: 'Gestão Pessoal',
  execucao: 'Execução',
};

export const CATEGORY_COLORS: Record<SkillCategory, string> = {
  comunicacao: '#3B82F6',    // blue
  lideranca: '#8B5CF6',      // violet
  colaboracao: '#10B981',     // emerald
  pensamento: '#F59E0B',     // amber
  gestao_pessoal: '#EC4899', // pink
  execucao: '#EF4444',       // red
};

export const CATEGORY_EMOJIS: Record<SkillCategory, string> = {
  comunicacao: '💬',
  lideranca: '👑',
  colaboracao: '🤝',
  pensamento: '🧠',
  gestao_pessoal: '🧘',
  execucao: '🚀',
};

export interface SkillScore {
  skillId: string;
  score: number; // 1-10
}

export interface Person {
  id: string;
  name: string;
  scores: SkillScore[];
  addedVia: 'manual' | 'ocr';
  createdAt: number;
}

export interface Team {
  id: string;
  members: Person[];
  coverageScore: number;      // 0-100 (how well skills are covered)
  complementarityScore: number; // 0-100 (diversity of strengths)
  overallScore: number;        // weighted combination
}
