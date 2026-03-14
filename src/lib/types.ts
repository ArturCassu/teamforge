// ─── Room Skill (dynamic, per-room) ──────────────────────────────
export interface RoomSkill {
  id: string;
  name: string;
  order: number;
}

export interface SkillScore {
  skillId: string; // RoomSkill.id
  score: number;   // 1-10
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
  coverageScore: number;        // 0-100
  complementarityScore: number; // 0-100
  overallScore: number;         // weighted combination
}

// ─── Default templates ──────────────────────────────────────────
// Users can load these as a starting point when creating a room.
export const DEFAULT_SKILL_TEMPLATES: Record<string, string[]> = {
  'Soft Skills (30)': [
    'Escuta Ativa', 'Oratória', 'Escrita', 'Feedback', 'Negociação',
    'Tomada de Decisão', 'Delegação', 'Visão Estratégica', 'Motivação', 'Gestão de Conflitos',
    'Trabalho em Equipe', 'Flexibilidade', 'Empatia', 'Networking', 'Inclusão',
    'Pensamento Crítico', 'Criatividade', 'Resolução de Problemas', 'Pensamento Analítico', 'Aprendizado Contínuo',
    'Autoconhecimento', 'Resiliência', 'Gestão do Tempo', 'Organização', 'Inteligência Emocional',
    'Proatividade', 'Orientação a Resultados', 'Atenção a Detalhes', 'Adaptabilidade', 'Accountability',
  ],
  'Liderança (10)': [
    'Tomada de Decisão', 'Delegação', 'Visão Estratégica', 'Comunicação',
    'Gestão de Conflitos', 'Motivação', 'Feedback', 'Resiliência', 'Empatia', 'Accountability',
  ],
  'Tech Team (15)': [
    'Resolução de Problemas', 'Pensamento Analítico', 'Comunicação', 'Code Review',
    'Documentação', 'Colaboração', 'Proatividade', 'Atenção a Detalhes', 'Aprendizado Contínuo',
    'Gestão do Tempo', 'Adaptabilidade', 'Mentoria', 'Ownership', 'Criatividade', 'Debugging',
  ],
};
