import { Person, Team, SkillScore } from './types';
import { SKILLS } from './skills';

/**
 * Algoritmo de formação de times por complementaridade de soft skills.
 *
 * Estratégia:
 * 1. Calcula o "perfil de forças" de cada pessoa (skills onde score >= 7)
 * 2. Usa greedy assignment: para cada time, adiciona a pessoa que mais
 *    COMPLEMENTA as skills que o time ainda não cobre
 * 3. Balanceia cobertura (cada skill coberta por ≥1 membro forte) e
 *    diversidade (evita sobreposição de perfis iguais)
 */

export function buildTeams(people: Person[], teamSize: number): Team[] {
  if (people.length < teamSize) {
    return [createTeam('team-1', people)];
  }

  const numTeams = Math.ceil(people.length / teamSize);
  const teams: Person[][] = Array.from({ length: numTeams }, () => []);
  const assigned = new Set<string>();

  // Seed: assign most diverse people first (one per team)
  const sorted = [...people].sort((a, b) => {
    const aStrengths = countStrengths(a);
    const bStrengths = countStrengths(b);
    return bStrengths - aStrengths;
  });

  // Round 1: seed each team with a strong, distinct leader
  for (let t = 0; t < numTeams && t < sorted.length; t++) {
    const person = sorted[t];
    teams[t].push(person);
    assigned.add(person.id);
  }

  // Round 2+: greedy complementary assignment
  const remaining = people.filter((p) => !assigned.has(p.id));

  // Shuffle remaining for fairness
  shuffleArray(remaining);

  for (const person of remaining) {
    // Find team that benefits most from this person
    let bestTeam = 0;
    let bestGain = -Infinity;

    for (let t = 0; t < numTeams; t++) {
      if (teams[t].length >= teamSize) continue;

      const gain = calculateComplementaryGain(teams[t], person);
      // Slight preference for smaller teams (balance)
      const sizeBonus = (teamSize - teams[t].length) * 0.5;
      const totalGain = gain + sizeBonus;

      if (totalGain > bestGain) {
        bestGain = totalGain;
        bestTeam = t;
      }
    }

    teams[bestTeam].push(person);
  }

  return teams.map((members, i) => createTeam(`team-${i + 1}`, members));
}

function createTeam(id: string, members: Person[]): Team {
  const coverage = calculateCoverage(members);
  const complementarity = calculateComplementarity(members);
  const overall = coverage * 0.6 + complementarity * 0.4;

  return {
    id,
    members,
    coverageScore: Math.round(coverage),
    complementarityScore: Math.round(complementarity),
    overallScore: Math.round(overall),
  };
}

/**
 * Coverage: % of skills where at least one member scores >= 7
 */
function calculateCoverage(members: Person[]): number {
  if (members.length === 0) return 0;

  let covered = 0;
  for (const skill of SKILLS) {
    const maxScore = Math.max(
      ...members.map((m) => getScore(m, skill.id)),
      0
    );
    if (maxScore >= 7) covered++;
  }

  return (covered / SKILLS.length) * 100;
}

/**
 * Complementarity: measures how diverse the team strengths are
 * Higher = less overlap in top skills
 */
function calculateComplementarity(members: Person[]): number {
  if (members.length <= 1) return 100;

  let totalDiversity = 0;
  let comparisons = 0;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const profileA = getStrengthProfile(members[i]);
      const profileB = getStrengthProfile(members[j]);

      // Cosine distance — lower overlap = higher complementarity
      const dotProduct = profileA.reduce((sum, val, idx) => sum + val * profileB[idx], 0);
      const magA = Math.sqrt(profileA.reduce((sum, val) => sum + val * val, 0));
      const magB = Math.sqrt(profileB.reduce((sum, val) => sum + val * val, 0));

      const similarity = magA && magB ? dotProduct / (magA * magB) : 0;
      totalDiversity += (1 - similarity);
      comparisons++;
    }
  }

  return comparisons > 0 ? (totalDiversity / comparisons) * 100 : 100;
}

/**
 * How much a person adds to a team's uncovered skills
 */
function calculateComplementaryGain(teamMembers: Person[], candidate: Person): number {
  let gain = 0;

  for (const skill of SKILLS) {
    const currentMax = Math.max(
      ...teamMembers.map((m) => getScore(m, skill.id)),
      0
    );
    const candidateScore = getScore(candidate, skill.id);

    // More gain for covering weak spots
    if (currentMax < 5 && candidateScore >= 7) {
      gain += 3; // Big gain: covers a gap
    } else if (currentMax < 7 && candidateScore >= 7) {
      gain += 1.5; // Moderate gain: strengthens weak area
    } else if (candidateScore > currentMax) {
      gain += 0.3; // Small gain: marginal improvement
    } else if (candidateScore >= 7 && currentMax >= 7) {
      gain -= 0.5; // Penalty: overlap of strengths
    }
  }

  return gain;
}

function getScore(person: Person, skillId: string): number {
  return person.scores.find((s) => s.skillId === skillId)?.score ?? 5;
}

function countStrengths(person: Person): number {
  return person.scores.filter((s) => s.score >= 7).length;
}

function getStrengthProfile(person: Person): number[] {
  return SKILLS.map((skill) => {
    const score = getScore(person, skill.id);
    return score >= 7 ? score : 0; // Binary-ish: only strengths matter
  });
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Get team statistics for display
 */
export function getTeamStats(team: Team) {
  const avgScores: Record<string, number> = {};

  for (const skill of SKILLS) {
    const scores = team.members.map((m) => getScore(m, skill.id));
    avgScores[skill.id] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const sorted = [...SKILLS].sort((a, b) => avgScores[b.id] - avgScores[a.id]);
  const strongSkills = sorted.slice(0, 5);
  const weakSkills = sorted.slice(-5).reverse();

  return { avgScores, strongSkills, weakSkills };
}
