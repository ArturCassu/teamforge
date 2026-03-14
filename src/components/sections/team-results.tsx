'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { buildTeams, getTeamStats } from '@/lib/team-builder';
import { type Team, CATEGORY_COLORS } from '@/lib/types';
import { ProgressRing } from '@/components/ui/progress-ring';
import { RadarChart } from '@/components/ui/radar-chart';

export function TeamResults() {
  const { people, teams, teamSize, setTeams, setTeamSize } = useApp();
  const [isBuilding, setIsBuilding] = useState(false);

  const canBuild = people.length >= teamSize;

  const handleBuild = () => {
    setIsBuilding(true);
    // Small timeout so UI can show the transition
    setTimeout(() => {
      const result = buildTeams(people, teamSize);
      setTeams(result);
      setIsBuilding(false);
    }, 100);
  };

  const handleShuffle = () => {
    setIsBuilding(true);
    setTimeout(() => {
      const result = buildTeams(people, teamSize);
      setTeams(result);
      setIsBuilding(false);
    }, 100);
  };

  const avgOverall = useMemo(() => {
    if (teams.length === 0) return 0;
    return Math.round(teams.reduce((sum, t) => sum + t.overallScore, 0) / teams.length);
  }, [teams]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">⚡ Montar Times</h2>

        <div className="flex flex-wrap items-end gap-4">
          {/* Team size selector */}
          <div>
            <label htmlFor="team-size" className="block text-sm text-zinc-400 mb-1.5">
              Tamanho do time
            </label>
            <div className="flex items-center gap-2">
              <input
                id="team-size"
                type="range"
                min={3}
                max={10}
                step={1}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-32 h-2 appearance-none rounded-full bg-zinc-700 cursor-pointer
                  accent-blue-500
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-blue-500
                  [&::-webkit-slider-thumb]:cursor-grab
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-blue-500
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-grab"
              />
              <span className="text-white font-semibold tabular-nums w-6 text-center">
                {teamSize}
              </span>
            </div>
          </div>

          {/* Build button */}
          <button
            type="button"
            onClick={handleBuild}
            disabled={!canBuild || isBuilding}
            className="py-2.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700
              disabled:text-zinc-500 text-white font-medium transition-colors cursor-pointer
              disabled:cursor-not-allowed"
          >
            {isBuilding ? 'Montando...' : 'Montar Times'}
          </button>

          {/* Shuffle button (only if teams exist) */}
          {teams.length > 0 && (
            <button
              type="button"
              onClick={handleShuffle}
              disabled={isBuilding}
              className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white
                font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              🔀 Reorganizar
            </button>
          )}
        </div>

        {!canBuild && people.length > 0 && (
          <p className="text-sm text-amber-400/80">
            ⚠ Precisa de pelo menos {teamSize} pessoas (tem {people.length})
          </p>
        )}
      </div>

      {/* Summary */}
      {teams.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">
              {teams.length} time{teams.length > 1 ? 's' : ''} formado{teams.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {people.length} pessoas distribuídas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Score médio geral</span>
            <span className="text-2xl font-bold text-white tabular-nums">{avgOverall}</span>
          </div>
        </div>
      )}

      {/* Team cards */}
      {teams.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {teams.map((team, idx) => (
            <TeamCard key={team.id} team={team} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Team Card ─────────────── */

function TeamCard({ team, index }: { team: Team; index: number }) {
  const stats = useMemo(() => getTeamStats(team), [team]);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Time {index + 1}</h3>
        <span className="text-xs text-zinc-500">
          {team.members.length} membro{team.members.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Members */}
      <div className="flex flex-wrap gap-1.5">
        {team.members.map((member) => (
          <span
            key={member.id}
            className="inline-flex items-center gap-1 text-sm bg-zinc-800 text-zinc-200
              rounded-lg px-2.5 py-1"
          >
            {member.addedVia === 'manual' ? '📝' : '📷'} {member.name}
          </span>
        ))}
      </div>

      {/* Score rings */}
      <div className="flex items-center justify-center gap-6">
        <ProgressRing
          value={team.coverageScore}
          label="Cobertura"
          color="#10B981"
          size={72}
        />
        <ProgressRing
          value={team.complementarityScore}
          label="Complementar."
          color="#8B5CF6"
          size={72}
        />
        <ProgressRing
          value={team.overallScore}
          label="Overall"
          color="#3B82F6"
          size={72}
        />
      </div>

      {/* Radar chart */}
      <div className="flex justify-center">
        <RadarChart scores={stats.avgScores} size={220} color="#3B82F6" />
      </div>

      {/* Strong & weak skills */}
      <div className="grid grid-cols-2 gap-3">
        {/* Strengths */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
            Fortes ({stats.strongSkills.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {stats.strongSkills.length === 0 && (
              <span className="text-xs text-zinc-600">Nenhuma</span>
            )}
            {stats.strongSkills.slice(0, 6).map((skill) => (
              <span
                key={skill.id}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: CATEGORY_COLORS[skill.category] + '22',
                  color: CATEGORY_COLORS[skill.category],
                }}
              >
                {skill.name}
              </span>
            ))}
            {stats.strongSkills.length > 6 && (
              <span className="text-xs text-zinc-500">
                +{stats.strongSkills.length - 6}
              </span>
            )}
          </div>
        </div>

        {/* Weaknesses */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
            Fracas ({stats.weakSkills.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {stats.weakSkills.length === 0 && (
              <span className="text-xs text-zinc-600">Nenhuma</span>
            )}
            {stats.weakSkills.slice(0, 6).map((skill) => (
              <span
                key={skill.id}
                className="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded-full font-medium"
              >
                {skill.name}
              </span>
            ))}
            {stats.weakSkills.length > 6 && (
              <span className="text-xs text-zinc-500">
                +{stats.weakSkills.length - 6}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
