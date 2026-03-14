'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom } from '@/lib/api';
import { DEFAULT_SKILL_TEMPLATES } from '@/lib/types';

export default function Home() {
  const router = useRouter();

  // Create Room
  const [roomName, setRoomName] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showSkillEditor, setShowSkillEditor] = useState(false);
  const skillInputRef = useRef<HTMLInputElement>(null);

  // Join Room
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const addSkill = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput('');
    skillInputRef.current?.focus();
  }, [skills]);

  const removeSkill = useCallback((index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const loadTemplate = useCallback((templateName: string) => {
    const template = DEFAULT_SKILL_TEMPLATES[templateName];
    if (!template) return;
    setSkills(template);
  }, []);

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomName.trim();
    if (!trimmed) return;
    if (skills.length === 0) {
      setCreateError('Adicione pelo menos uma skill');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const room = await createRoom(trimmed, skills);
      router.push(`/sala/${room.code}/admin`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar sala');
      setCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError('O código deve ter 6 caracteres');
      return;
    }
    router.push(`/sala/${code}`);
  };

  const features = [
    {
      icon: '✏️',
      title: 'Skills Customizáveis',
      desc: 'Defina suas próprias skills ou use templates prontos',
    },
    {
      icon: '🧠',
      title: 'Algoritmo Inteligente',
      desc: 'Maximiza complementaridade e cobertura de habilidades no time',
    },
    {
      icon: '📱',
      title: 'Multi-dispositivo',
      desc: 'Cada participante preenche do próprio celular em tempo real',
    },
    {
      icon: '🔀',
      title: 'Drag & Drop',
      desc: 'Ajuste manual dos times com arrastar e soltar entre equipes',
    },
  ];

  return (
    <div className="flex flex-col items-center gap-16 py-8">
      {/* Hero */}
      <section className="text-center space-y-4 max-w-2xl animate-fade-in">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-sm text-emerald-400">
          <span>🔀</span>
          <span>Plataforma de montagem de times</span>
        </div>
        <h2 className="text-4xl font-bold text-white sm:text-5xl leading-tight">
          Monte Times{' '}
          <span className="text-emerald-400">Complementares</span>
          <br />
          por Soft Skills
        </h2>
        <p className="text-zinc-400 text-lg max-w-lg mx-auto">
          Crie uma sala, defina as skills que importam, compartilhe o código.
          O algoritmo forma times equilibrados automaticamente.
        </p>
      </section>

      {/* Cards */}
      <div className="grid gap-6 sm:grid-cols-2 w-full max-w-2xl animate-fade-in">
        {/* Create Room */}
        <form
          onSubmit={handleCreate}
          className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4 sm:col-span-2"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-xl">
              ✨
            </span>
            <div>
              <h3 className="text-white font-semibold">Criar Sala</h3>
              <p className="text-zinc-500 text-sm">Defina as skills e compartilhe o código</p>
            </div>
          </div>

          <input
            type="text"
            value={roomName}
            onChange={(e) => {
              setRoomName(e.target.value);
              setCreateError('');
              if (e.target.value.trim() && !showSkillEditor) {
                setShowSkillEditor(true);
              }
            }}
            placeholder="Nome da sala (ex: Retro Q3)"
            maxLength={60}
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white
              placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50
              focus:border-emerald-500 transition-colors"
          />

          {/* Skill editor — shows when name is typed */}
          {showSkillEditor && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400 font-medium">
                  Skills ({skills.length})
                </label>
                {/* Template buttons */}
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {Object.keys(DEFAULT_SKILL_TEMPLATES).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => loadTemplate(name)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400
                        hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer
                        border border-zinc-700/50"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill tags */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-zinc-800/50 border border-zinc-800 max-h-40 overflow-y-auto">
                  {skills.map((skill, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-sm px-2.5 py-1 rounded-lg
                        bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(i)}
                        className="text-emerald-400/60 hover:text-red-400 transition-colors cursor-pointer ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add skill input */}
              <div className="flex gap-2">
                <input
                  ref={skillInputRef}
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Adicionar skill (Enter para confirmar)"
                  className="flex-1 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2 text-white text-sm
                    placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                    focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => addSkill(skillInput)}
                  disabled={!skillInput.trim()}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm
                    font-medium transition-colors cursor-pointer disabled:opacity-40
                    disabled:cursor-not-allowed border border-zinc-700"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {createError && (
            <p className="text-red-400 text-sm">{createError}</p>
          )}

          <button
            type="submit"
            disabled={!roomName.trim() || skills.length === 0 || creating}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500
              disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium
              transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {creating ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Criando...
              </span>
            ) : (
              `Criar Sala com ${skills.length} skill${skills.length !== 1 ? 's' : ''}`
            )}
          </button>
        </form>

        {/* Join Room */}
        <form
          onSubmit={handleJoin}
          className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4 sm:col-span-2"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/15 text-xl">
              🔗
            </span>
            <div>
              <h3 className="text-white font-semibold">Entrar na Sala</h3>
              <p className="text-zinc-500 text-sm">Com o código de 6 dígitos</p>
            </div>
          </div>

          <input
            type="text"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase().slice(0, 6));
              setJoinError('');
            }}
            placeholder="Ex: ABC123"
            maxLength={6}
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white
              placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50
              focus:border-blue-500 transition-colors font-mono text-center text-lg tracking-widest uppercase"
          />

          {joinError && <p className="text-red-400 text-sm">{joinError}</p>}

          <button
            type="submit"
            disabled={joinCode.trim().length !== 6}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500
              disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium
              transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Entrar
          </button>
        </form>
      </div>

      {/* Features */}
      <section className="w-full max-w-3xl animate-fade-in">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-4 text-center space-y-2"
            >
              <span className="text-2xl">{f.icon}</span>
              <h4 className="text-sm font-semibold text-white">{f.title}</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
