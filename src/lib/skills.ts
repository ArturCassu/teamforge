import { Skill, SkillCategory } from './types';

export const SKILLS: Skill[] = [
  // Comunicação
  { id: 'escuta_ativa', name: 'Escuta Ativa', category: 'comunicacao' },
  { id: 'oratoria', name: 'Oratória', category: 'comunicacao' },
  { id: 'escrita', name: 'Escrita', category: 'comunicacao' },
  { id: 'feedback', name: 'Feedback', category: 'comunicacao' },
  { id: 'negociacao', name: 'Negociação', category: 'comunicacao' },

  // Liderança
  { id: 'tomada_decisao', name: 'Tomada de Decisão', category: 'lideranca' },
  { id: 'delegacao', name: 'Delegação', category: 'lideranca' },
  { id: 'visao_estrategica', name: 'Visão Estratégica', category: 'lideranca' },
  { id: 'motivacao', name: 'Motivação', category: 'lideranca' },
  { id: 'gestao_conflitos', name: 'Gestão de Conflitos', category: 'lideranca' },

  // Colaboração
  { id: 'trabalho_equipe', name: 'Trabalho em Equipe', category: 'colaboracao' },
  { id: 'flexibilidade', name: 'Flexibilidade', category: 'colaboracao' },
  { id: 'empatia', name: 'Empatia', category: 'colaboracao' },
  { id: 'networking', name: 'Networking', category: 'colaboracao' },
  { id: 'inclusao', name: 'Inclusão', category: 'colaboracao' },

  // Pensamento
  { id: 'pensamento_critico', name: 'Pensamento Crítico', category: 'pensamento' },
  { id: 'criatividade', name: 'Criatividade', category: 'pensamento' },
  { id: 'resolucao_problemas', name: 'Resolução de Problemas', category: 'pensamento' },
  { id: 'pensamento_analitico', name: 'Pensamento Analítico', category: 'pensamento' },
  { id: 'aprendizado_continuo', name: 'Aprendizado Contínuo', category: 'pensamento' },

  // Gestão Pessoal
  { id: 'autoconhecimento', name: 'Autoconhecimento', category: 'gestao_pessoal' },
  { id: 'resiliencia', name: 'Resiliência', category: 'gestao_pessoal' },
  { id: 'gestao_tempo', name: 'Gestão do Tempo', category: 'gestao_pessoal' },
  { id: 'organizacao', name: 'Organização', category: 'gestao_pessoal' },
  { id: 'inteligencia_emocional', name: 'Inteligência Emocional', category: 'gestao_pessoal' },

  // Execução
  { id: 'proatividade', name: 'Proatividade', category: 'execucao' },
  { id: 'orientacao_resultados', name: 'Orientação a Resultados', category: 'execucao' },
  { id: 'atencao_detalhes', name: 'Atenção a Detalhes', category: 'execucao' },
  { id: 'adaptabilidade', name: 'Adaptabilidade', category: 'execucao' },
  { id: 'accountability', name: 'Accountability', category: 'execucao' },
];

export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return SKILLS.filter((s) => s.category === category);
}

export function getCategories(): SkillCategory[] {
  return [...new Set(SKILLS.map((s) => s.category))];
}
