'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom } from '@/lib/api';

export default function Home() {
  const router = useRouter();

  // Create Room
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join Room
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomName.trim();
    if (!trimmed) return;

    setCreating(true);
    setCreateError('');
    try {
      const room = await createRoom(trimmed);
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
      icon: '📊',
      title: '30 Soft Skills',
      desc: '6 categorias cobrindo comunicação, liderança, colaboração e mais',
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
          Crie uma sala, compartilhe o código. Cada participante avalia suas habilidades
          e o algoritmo forma times equilibrados automaticamente.
        </p>
      </section>

      {/* Cards */}
      <div className="grid gap-6 sm:grid-cols-2 w-full max-w-2xl animate-fade-in">
        {/* Create Room */}
        <form
          onSubmit={handleCreate}
          className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-xl">
              ✨
            </span>
            <div>
              <h3 className="text-white font-semibold">Criar Sala</h3>
              <p className="text-zinc-500 text-sm">Você será o organizador</p>
            </div>
          </div>

          <div>
            <input
              type="text"
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value);
                setCreateError('');
              }}
              placeholder="Nome da sala (ex: Retro Q3)"
              maxLength={60}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white
                placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                focus:border-emerald-500 transition-colors"
            />
          </div>

          {createError && (
            <p className="text-red-400 text-sm">{createError}</p>
          )}

          <button
            type="submit"
            disabled={!roomName.trim() || creating}
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
              'Criar Sala'
            )}
          </button>
        </form>

        {/* Join Room */}
        <form
          onSubmit={handleJoin}
          className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4"
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

          <div>
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
          </div>

          {joinError && (
            <p className="text-red-400 text-sm">{joinError}</p>
          )}

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
