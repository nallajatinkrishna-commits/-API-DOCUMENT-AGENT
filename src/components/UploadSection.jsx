import React, { useState } from 'react';
import { Upload, Code2, Sparkles, FileArchive, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';
import { SAMPLES } from '../utils/samples';

export default function UploadSection({ onProcess, isAiConfigured, mode, setMode }) {
  const [activeTab, setActiveTab] = useState('samples'); // 'samples', 'paste', 'upload'
  const [code, setCode] = useState(SAMPLES.fastapi.code);
  const [filename, setFilename] = useState(SAMPLES.fastapi.filename);
  const [framework, setFramework] = useState('auto');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleSampleClick = (sampleKey) => {
    const sample = SAMPLES[sampleKey];
    setCode(sample.code);
    setFilename(sample.filename);
    setFramework(sample.framework);
    setActiveTab('paste');
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'upload' && selectedFile) {
      onProcess({ type: 'file', file: selectedFile, framework, mode });
    } else {
      onProcess({ type: 'code', code, filename, framework, mode });
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8 px-4">
      {/* Container card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automatic Route Extractor</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Turn Source Code into Clean API Docs
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Upload Python (FastAPI, Flask) or Node.js (Express) code to automatically generate complete Markdown & HTML API reference docs.
          </p>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex items-center justify-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl mb-6 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'samples'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Samples</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'paste'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Paste Code</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File / Zip</span>
          </button>
        </div>

        {/* Tab 1: Samples */}
        {activeTab === 'samples' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div
              onClick={() => handleSampleClick('fastapi')}
              className="group p-5 bg-slate-950/60 border border-slate-800 hover:border-sky-500/50 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-200 text-sm group-hover:text-sky-400">FastAPI Application</h4>
              <p className="text-xs text-slate-400 mt-1">APIRouter, Pydantic models, query/path parameters & auth dependencies.</p>
              <span className="inline-block mt-3 text-[11px] text-sky-400 font-semibold group-hover:underline">Load & Edit &rarr;</span>
            </div>

            <div
              onClick={() => handleSampleClick('flask')}
              className="group p-5 bg-slate-950/60 border border-slate-800 hover:border-sky-500/50 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-200 text-sm group-hover:text-sky-400">Flask Application</h4>
              <p className="text-xs text-slate-400 mt-1">Blueprints, url_prefix, converter paths (&lt;int:id&gt;), &amp; auth decorators.</p>
              <span className="inline-block mt-3 text-[11px] text-sky-400 font-semibold group-hover:underline">Load & Edit &rarr;</span>
            </div>

            <div
              onClick={() => handleSampleClick('express')}
              className="group p-5 bg-slate-950/60 border border-slate-800 hover:border-sky-500/50 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-200 text-sm group-hover:text-sky-400">Express JS Application</h4>
              <p className="text-xs text-slate-400 mt-1">Babel AST parser, Router prefixes, JSDocs &amp; middleware chains.</p>
              <span className="inline-block mt-3 text-[11px] text-sky-400 font-semibold group-hover:underline">Load & Edit &rarr;</span>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Code */}
        {activeTab === 'paste' && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">File Name</label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Framework Hint</label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="auto">Auto Detect</option>
                  <option value="fastapi">FastAPI (Python)</option>
                  <option value="flask">Flask (Python)</option>
                  <option value="express">Express (JavaScript/TypeScript)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Source Code</label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                placeholder="Paste FastAPI, Flask, or Express code here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed resize-none"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Upload File */}
        {activeTab === 'upload' && (
          <div className="mb-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                dragOver
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-3">
                <FileArchive className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-200 text-sm">
                {selectedFile ? selectedFile.name : 'Drag & drop single file or .zip archive here'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">Supports .py, .js, .ts, .jsx, .tsx or project .zip archives</p>

              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Browse Files</span>
                <input
                  type="file"
                  onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                  accept=".py,.js,.ts,.jsx,.tsx,.zip"
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Footer controls: Mode switch + CTA Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          {/* Mode Switcher */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">Generation Engine:</span>
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('template')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'template'
                    ? 'bg-slate-800 text-slate-100 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Template (Offline)
              </button>
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  mode === 'ai'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-300" />
                <span>AI Mode (Claude)</span>
              </button>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <span>Analyze & Generate Docs</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
