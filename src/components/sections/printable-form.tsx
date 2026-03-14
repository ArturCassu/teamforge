'use client';

import { SKILLS } from '@/lib/skills';
import { CATEGORY_LABELS, CATEGORY_EMOJIS, type SkillCategory } from '@/lib/types';

export function PrintableForm() {
  const categories = [...new Set(SKILLS.map((s) => s.category))] as SkillCategory[];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-form">
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          .print-form { background: white !important; color: black !important; }
          .print-page { page-break-after: always; }
        }
      `}</style>

      <div className="no-print mb-6 flex justify-center">
        <button
          onClick={handlePrint}
          className="rounded-lg bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-500 transition"
        >
          🖨️ Imprimir Formulário
        </button>
      </div>

      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-black shadow-xl print:shadow-none print:p-4">
        <div className="mb-6 border-b-2 border-black pb-4 text-center">
          <h1 className="text-2xl font-bold">🔀 TEAMFORGE</h1>
          <p className="text-sm text-gray-600">Avaliação de Soft Skills</p>
        </div>

        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700">Nome completo:</label>
          <div className="mt-1 border-b-2 border-dotted border-gray-400 pb-2 text-lg">
            &nbsp;
          </div>
        </div>

        <p className="mb-4 text-xs text-gray-500 italic">
          Para cada habilidade, escreva um número de 1 a 10 no espaço ao lado.
          (1 = muito baixo, 5 = médio, 10 = excelente)
        </p>

        {categories.map((cat) => (
          <div key={cat} className="mb-5">
            <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold uppercase text-gray-700">
              {CATEGORY_EMOJIS[cat]} {CATEGORY_LABELS[cat]}
            </h2>
            <div className="space-y-1.5">
              {SKILLS.filter((s) => s.category === cat).map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{skill.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">
                      {'·'.repeat(30 - skill.name.length)}
                    </span>
                    <div className="inline-block w-10 border-b-2 border-gray-400 text-center text-lg">
                      &nbsp;
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-6 border-t border-gray-200 pt-3 text-center text-xs text-gray-400">
          TeamForge — teamforge.vercel.app
        </div>
      </div>
    </div>
  );
}
