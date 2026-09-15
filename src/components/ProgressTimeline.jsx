import React from 'react';
import { Loader2, CheckCircle2, FileSearch, Code2, Sparkles } from 'lucide-react';

export default function ProgressTimeline({ step }) {
  const steps = [
    { id: 1, label: 'AST Code Parsing & Framework Detection', icon: FileSearch },
    { id: 2, label: 'Endpoint Route & Parameter Extraction', icon: Code2 },
    { id: 3, label: 'Documentation Payload & Examples Generation', icon: Sparkles },
  ];

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="font-bold text-lg text-slate-100">Analyzing Source Code</h3>
        <p className="text-xs text-slate-400 mt-1 mb-6">Extracting routes, handlers, and parameters...</p>

        <div className="space-y-4 text-left">
          {steps.map((s) => {
            const Icon = s.icon;
            const isDone = step > s.id;
            const isCurrent = step === s.id;

            return (
              <div
                key={s.id}
                className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-sky-950/40 border-sky-500/40 text-sky-300'
                    : isDone
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                    : 'opacity-40 border-transparent text-slate-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isCurrent
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>

                <div className="flex-1">
                  <p className="text-xs font-semibold">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
