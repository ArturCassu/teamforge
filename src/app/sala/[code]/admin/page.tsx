'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { RadarChart } from '@/components/ui/radar-chart';
import { ProgressRing } from '@/components/ui/progress-ring';
import { ScoreBadge } from '@/components/ui/score-badge';
import {
  getRoom,
  updateRoom,
  removePerson as apiRemovePerson,
  buildTeams as apiBuildTeams,
  movePerson as apiMovePerson,
  clearTeams as apiClearTeams,
  type RoomData,
  type PersonData,
  type TeamData,
  type SkillData,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AdminTab = 'people' | 'teams';

function getPersonTopSkills(person: PersonData, count = 3) {
  const sorted = [...person.scores].sort((a, b) => b.score - a.score);
  return sorted.slice(0, count);
}

function getPersonWeakSkills(person: PersonData, count = 2) {
  const sorted = [...person.scores].sort((a, b) => a.score - b.score);
  return sorted.slice(0, count);
}

function getSkillName(id: string, skills: SkillData[]): string {
  return skills.find((s) => s.id === id)?.name ?? id;
}

function getTeamScoresMap(team: TeamData, skills: SkillData[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const skill of skills) {
    const memberScores = team.members.map(
      (m) => m.scores.find((s) => s.skillId === skill.id)?.score ?? 5,
    );
    map[skill.id] = memberScores.length
      ? memberScores.reduce((a, b) => a + b, 0) / memberScores.length
      : 0;
  }
  return map;
}

function calculateCoverage(team: TeamData, skills: SkillData[]): number {
  if (skills.length === 0) return 0;
  let covered = 0;
  for (const skill of skills) {
    const max = Math.max(
      ...team.members.map((m) => m.scores.find((s) => s.skillId === skill.id)?.score ?? 5),
      0,
    );
    if (max >= 7) covered++;
  }
  return Math.round((covered / skills.length) * 100);
}

function calculateComplementarity(team: TeamData, skills: SkillData[]): number {
  if (team.members.length <= 1) return 100;
  const profiles = team.members.map((m) =>
    skills.map((sk) => {
      const score = m.scores.find((s) => s.skillId === sk.id)?.score ?? 5;
      return score >= 7 ? score : 0;
    }),
  );
  let totalDiv = 0;
  let comps = 0;
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const dot = profiles[i].reduce((s, v, k) => s + v * profiles[j][k], 0);
      const magA = Math.sqrt(profiles[i].reduce((s, v) => s + v * v, 0));
      const magB = Math.sqrt(profiles[j].reduce((s, v) => s + v * v, 0));
      const sim = magA && magB ? dot / (magA * magB) : 0;
      totalDiv += 1 - sim;
      comps++;
    }
  }
  return comps > 0 ? Math.round((totalDiv / comps) * 100) : 100;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('people');

  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingLock, setTogglingLock] = useState(false);
  const [copied, setCopied] = useState(false);

  const [teamSize, setTeamSize] = useState(5);
  const [building, setBuilding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [dragPersonId, setDragPersonId] = useState<string | null>(null);
  const [dropTargetTeam, setDropTargetTeam] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomRef = useRef<RoomData | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await getRoom(code);
      setRoom(data);
      roomRef.current = data;
      setTeamSize(data.teamSize);
      setError('');
    } catch (err) {
      if (!roomRef.current) {
        setError(err instanceof Error ? err.message : 'Sala não encontrada');
      }
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => { fetchRoom(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    pollingRef.current = setInterval(fetchRoom, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchRoom]);

  // ─── Actions ──────────────────────────────────────────────────────
  const handleToggleLock = async () => {
    if (!room) return;
    setTogglingLock(true);
    try {
      const newStatus = room.status === 'OPEN' ? 'LOCKED' : 'OPEN';
      await updateRoom(code, { status: newStatus });
      await fetchRoom();
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao alterar status'); }
    finally { setTogglingLock(false); }
  };

  const handleDeletePerson = async (personId: string) => {
    setDeleting(personId);
    try { await apiRemovePerson(code, personId); await fetchRoom(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro ao remover pessoa'); }
    finally { setDeleting(null); }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/sala/${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuildTeams = async () => {
    if (!room) return;
    setBuilding(true);
    try {
      if (teamSize !== room.teamSize) await updateRoom(code, { teamSize });
      await apiBuildTeams(code);
      await fetchRoom();
      setActiveTab('teams');
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao montar times'); }
    finally { setBuilding(false); }
  };

  const handleClearTeams = async () => {
    setClearing(true);
    try { await apiClearTeams(code); await fetchRoom(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro ao limpar times'); }
    finally { setClearing(false); }
  };

  const handleReorganize = async () => {
    setBuilding(true);
    try { await apiClearTeams(code); await apiBuildTeams(code); await fetchRoom(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro ao reorganizar'); }
    finally { setBuilding(false); }
  };

  // ─── Drag & Drop ─────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, personId: string) => {
    setDragPersonId(personId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', personId);
  };
  const handleDragOver = (e: React.DragEvent, teamId: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetTeam(teamId);
  };
  const handleDragLeave = () => setDropTargetTeam(null);
  const handleDrop = async (e: React.DragEvent, targetTeamId: string) => {
    e.preventDefault(); setDropTargetTeam(null);
    const personId = e.dataTransfer.getData('text/plain');
    if (!personId) return;
    const team = room?.teams.find((t) => t.id === targetTeamId);
    if (team?.members.some((m) => m.id === personId)) { setDragPersonId(null); return; }
    setMoving(true);
    try { await apiMovePerson(code, personId, targetTeamId); await fetchRoom(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro ao mover pessoa'); }
    finally { setMoving(false); setDragPersonId(null); }
  };
  const handleDragEnd = () => { setDragPersonId(null); setDropTargetTeam(null); };

  // ─── LOADING ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
        <svg className="animate-spin h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-zinc-400">Carregando sala...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
        <span className="text-5xl">😕</span>
        <p className="text-zinc-300 font-medium text-lg">{error || 'Sala não encontrada'}</p>
        <a href="/" className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors">← Voltar</a>
      </div>
    );
  }

  const people = room.people;
  const teams = room.teams;
  const skills = room.skills;
  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/sala/${code}` : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Room header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{room.name}</h2>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              room.status === 'OPEN' ? 'bg-emerald-500/15 text-emerald-400'
                : room.status === 'LOCKED' ? 'bg-amber-500/15 text-amber-400'
                : 'bg-blue-500/15 text-blue-400'
            }`}>
              {room.status === 'OPEN' ? '🟢 Aberta' : room.status === 'LOCKED' ? '🔒 Travada' : '✅ Concluída'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="font-mono text-emerald-400 text-lg tracking-widest bg-emerald-500/10 px-3 py-0.5 rounded-lg">
              {room.code}
            </span>
            <span>👥 {people.length} participante{people.length !== 1 ? 's' : ''}</span>
            <span>📊 {skills.length} skill{skills.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-white font-medium transition-colors cursor-pointer border border-zinc-700">
            {copied ? '✅ Copiado!' : '📋 Copiar Link'}
          </button>
          <button type="button" onClick={handleToggleLock} disabled={togglingLock}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 border ${
              room.status === 'OPEN'
                ? 'bg-amber-600/15 hover:bg-amber-600/25 text-amber-400 border-amber-600/30'
                : 'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border-emerald-600/30'
            }`}>
            {room.status === 'OPEN' ? '🔒 Travar Sala' : '🔓 Reabrir Sala'}
          </button>
        </div>
      </div>

      {/* Share link */}
      <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50 px-4 py-3">
        <span className="text-zinc-500 text-sm shrink-0">Link para participantes:</span>
        <code className="flex-1 text-sm text-emerald-400 truncate font-mono">{shareLink}</code>
        <button type="button" onClick={handleCopyLink}
          className="shrink-0 text-zinc-400 hover:text-white transition-colors cursor-pointer text-sm">
          {copied ? '✅' : '📋'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 cursor-pointer">✕</button>
        </div>
      )}

      {/* Tabs */}
      <nav className="flex justify-center">
        <div className="inline-flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
          {([
            { id: 'people' as AdminTab, label: 'Pessoas', emoji: '👥', count: people.length },
            { id: 'teams' as AdminTab, label: 'Times', emoji: '⚡', count: teams.length },
          ]).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.id ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
              }`}>
              <span>{tab.emoji}</span><span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ═══════════════════ PEOPLE TAB ═══════════════════ */}
      {activeTab === 'people' && (
        <div className="space-y-4">
          {people.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-12 text-center space-y-3">
              <span className="text-5xl">🫥</span>
              <p className="text-zinc-300 font-medium">Nenhum participante ainda</p>
              <p className="text-zinc-500 text-sm">Compartilhe o link acima para que as pessoas preencham suas skills</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => {
                const top = getPersonTopSkills(person);
                const weak = getPersonWeakSkills(person);
                return (
                  <div key={person.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3 animate-fade-in">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-semibold">{person.name}</p>
                        <p className="text-zinc-500 text-xs">via {person.addedVia === 'ocr' ? '📷 OCR' : '📝 Manual'}</p>
                      </div>
                      <button type="button" onClick={() => handleDeletePerson(person.id)}
                        disabled={deleting === person.id}
                        className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50 p-1 rounded-lg hover:bg-red-500/10"
                        title="Remover">
                        {deleting === person.id ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : '🗑'}
                      </button>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">💪 Fortes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {top.map((s) => (
                          <span key={s.skillId}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                            {getSkillName(s.skillId, skills)}
                            <ScoreBadge score={s.score} size="sm" />
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">📉 A desenvolver</p>
                      <div className="flex flex-wrap gap-1.5">
                        {weak.map((s) => (
                          <span key={s.skillId}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                            {getSkillName(s.skillId, skills)}
                            <ScoreBadge score={s.score} size="sm" />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {people.length >= 2 && (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
              <h3 className="text-white font-semibold">⚡ Montar Times</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  Pessoas por time:
                  <select value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer">
                    {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <span className="text-zinc-500 text-sm">
                  → {Math.ceil(people.length / teamSize)} time{Math.ceil(people.length / teamSize) > 1 ? 's' : ''}
                </span>
              </div>
              <button type="button" onClick={handleBuildTeams} disabled={building}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium transition-colors cursor-pointer disabled:cursor-not-allowed">
                {building ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Montando...
                  </span>
                ) : '⚡ Montar Times'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TEAMS TAB ═══════════════════ */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          {teams.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-12 text-center space-y-3">
              <span className="text-5xl">⚡</span>
              <p className="text-zinc-300 font-medium">Nenhum time formado ainda</p>
              <p className="text-zinc-500 text-sm">Vá para a aba &ldquo;Pessoas&rdquo; e clique em &ldquo;Montar Times&rdquo;</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <button type="button" onClick={handleReorganize} disabled={building}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 border border-emerald-600/30">
                  🔀 Reorganizar
                </button>
                <button type="button" onClick={handleClearTeams} disabled={clearing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 border border-red-600/20">
                  🗑 Limpar Times
                </button>
                {moving && (
                  <span className="text-sm text-zinc-400 inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Movendo...
                  </span>
                )}
              </div>
              <p className="text-zinc-500 text-sm">💡 Arraste membros entre times para ajustar manualmente</p>

              <div className="grid gap-6 lg:grid-cols-2">
                {teams.map((team) => {
                  const coverage = calculateCoverage(team, skills);
                  const complementarity = calculateComplementarity(team, skills);
                  const overall = Math.round(coverage * 0.6 + complementarity * 0.4);
                  const scoresMap = getTeamScoresMap(team, skills);
                  const isDropTarget = dropTargetTeam === team.id;

                  return (
                    <div key={team.id}
                      onDragOver={(e) => handleDragOver(e, team.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, team.id)}
                      className={`rounded-2xl border p-5 space-y-4 transition-colors ${
                        isDropTarget ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-zinc-900 border-zinc-800'
                      }`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">{team.name}</h3>
                        <span className="text-sm text-zinc-400">{team.members.length} membro{team.members.length !== 1 ? 's' : ''}</span>
                      </div>

                      <div className="flex items-center justify-center gap-4 py-2">
                        <ProgressRing value={coverage} label="Cobertura" color="#10B981" size={70} />
                        <ProgressRing value={complementarity} label="Complemen." color="#8B5CF6" size={70} />
                        <ProgressRing value={overall} label="Geral" color="#3B82F6" size={70} />
                      </div>

                      <div className="flex justify-center">
                        <RadarChart
                          scores={scoresMap}
                          members={team.members.map((m) => ({
                            label: m.name,
                            scores: Object.fromEntries(
                              skills.map((sk) => [
                                sk.id,
                                m.scores.find((s) => s.skillId === sk.id)?.score ?? 0,
                              ]),
                            ),
                            color: '',
                          }))}
                          skills={skills}
                          size={240}
                          color="#10B981"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Membros</p>
                        {team.members.map((member) => {
                          const top = getPersonTopSkills(member, 2);
                          const isDragging = dragPersonId === member.id;
                          return (
                            <div key={member.id} draggable onDragStart={(e) => handleDragStart(e, member.id)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center gap-3 rounded-xl px-3 py-2 cursor-grab active:cursor-grabbing transition-all select-none ${
                                isDragging ? 'opacity-40 scale-95 bg-zinc-800' : 'bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50'
                              }`}>
                              <span className="text-zinc-500 text-sm">⠿</span>
                              <span className="text-white text-sm font-medium flex-1 truncate">{member.name}</span>
                              <div className="flex gap-1">
                                {top.map((s) => (
                                  <span key={s.skillId}
                                    className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400"
                                    title={getSkillName(s.skillId, skills)}>
                                    {getSkillName(s.skillId, skills).slice(0, 8)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Top skills averages */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {Object.entries(scoresMap)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([skillId, avg]) => (
                            <span key={skillId}
                              className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                              {getSkillName(skillId, skills)} {avg.toFixed(1)}
                            </span>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
