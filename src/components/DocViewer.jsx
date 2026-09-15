import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { Download, Copy, Check, FileText, Code2, Eye, Sparkles } from 'lucide-react';
import { downloadExport } from '../utils/api';

export default function DocViewer({
  selectedEndpointDoc,
  combinedMarkdown,
  combinedHtml,
  modeUsed,
  onReset,
}) {
  const [activeTab, setActiveTab] = useState('detail'); // 'detail', 'full', 'raw'
  const [copied, setCopied] = useState(false);

  // Configure marked for safe HTML rendering
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const getRenderedContent = () => {
    if (activeTab === 'full') {
      return marked.parse(combinedMarkdown || '');
    } else {
      return marked.parse(selectedEndpointDoc ? selectedEndpointDoc.markdown : combinedMarkdown || '');
    }
  };

  const handleCopyMarkdown = async () => {
    const textToCopy =
      activeTab === 'full'
        ? combinedMarkdown
        : selectedEndpointDoc
        ? selectedEndpointDoc.markdown
        : combinedMarkdown;

    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Viewer Top Action Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('detail')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'detail'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Endpoint Detail</span>
          </button>
          <button
            onClick={() => setActiveTab('full')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'full'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Full Project Doc</span>
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'raw'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Raw Markdown</span>
          </button>
        </div>

        {/* Mode Indicator & Action Buttons */}
        <div className="flex items-center gap-2">
          {modeUsed === 'ai' && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-[11px] font-medium text-indigo-300">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>AI Mode</span>
            </span>
          )}

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
            <span>{copied ? 'Copied!' : 'Copy MD'}</span>
          </button>

          <button
            onClick={() => downloadExport(combinedMarkdown, 'md')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export .MD</span>
          </button>

          <button
            onClick={() => downloadExport(combinedMarkdown, 'html')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition-colors shadow-md shadow-sky-500/20"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span>Export .HTML</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {activeTab === 'raw' ? (
          <div className="max-w-4xl mx-auto">
            <textarea
              readOnly
              value={activeTab === 'full' ? combinedMarkdown : selectedEndpointDoc ? selectedEndpointDoc.markdown : combinedMarkdown}
              rows={24}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs font-mono text-slate-200 focus:outline-none leading-relaxed resize-none shadow-2xl"
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl">
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: getRenderedContent() }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
