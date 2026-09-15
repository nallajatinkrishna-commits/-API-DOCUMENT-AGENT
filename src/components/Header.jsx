import React from 'react';
import { FileCode, Sparkles, Key, Cpu } from 'lucide-react';

export default function Header({ isAiActive, onOpenKeyDrawer, onReset }) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand logo */}
        <div 
          onClick={onReset} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <FileCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 group-hover:text-sky-400 transition-colors">
                API Doc Agent
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Multi-framework API Parser & Generator</p>
          </div>
        </div>

        {/* Status indicator & Key configuration */}
        <div className="flex items-center gap-3">
          {/* Mode Badge */}
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            isAiActive 
              ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300' 
              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
          }`}>
            {isAiActive ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>AI Mode (Claude Active)</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Template Mode (Offline)</span>
              </>
            )}
          </div>

          {/* API Key Modal Button */}
          <button
            onClick={onOpenKeyDrawer}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Configure Anthropic API Key"
          >
            <Key className="w-3.5 h-3.5 text-sky-400" />
            <span>API Key</span>
          </button>
        </div>
      </div>
    </header>
  );
}
