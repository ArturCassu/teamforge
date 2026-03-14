'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🔀</span>
          <h1 className="text-xl font-bold text-white">
            Team<span className="text-emerald-400">Forge</span>
          </h1>
        </Link>
        <p className="hidden text-sm text-zinc-500 sm:block">
          Monte times com soft skills complementares
        </p>
      </div>
    </header>
  );
}
