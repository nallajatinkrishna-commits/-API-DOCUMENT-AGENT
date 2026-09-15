import React, { useState } from 'react';
import { Search, Filter, Code2, Server } from 'lucide-react';

export default function EndpointSidebar({
  endpoints,
  selectedEndpointId,
  onSelectEndpoint,
  frameworksMap,
}) {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesSearch =
      ep.path.toLowerCase().includes(search.toLowerCase()) ||
      ep.handler_name.toLowerCase().includes(search.toLowerCase()) ||
      ep.file_path.toLowerCase().includes(search.toLowerCase());

    const matchesMethod = methodFilter === 'ALL' || ep.method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const getMethodBadgeClass = (method) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40';
      case 'POST':
        return 'bg-blue-950/80 text-blue-400 border-blue-500/40';
      case 'PUT':
        return 'bg-amber-950/80 text-amber-400 border-amber-500/40';
      case 'DELETE':
        return 'bg-rose-950/80 text-rose-400 border-rose-500/40';
      case 'PATCH':
        return 'bg-purple-950/80 text-purple-400 border-purple-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <aside className="w-full lg:w-80 bg-slate-900/70 border-r border-slate-800 flex flex-col h-full">
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-sm text-slate-100">Detected Routes</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {filteredEndpoints.length} / {endpoints.length}
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter routes or handlers..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        {/* Method pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {methods.map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all ${
                methodFilter === m
                  ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/20'
                  : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredEndpoints.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No endpoints matching filter criteria.
          </div>
        ) : (
          filteredEndpoints.map((ep) => {
            const isSelected = selectedEndpointId === ep.id;
            return (
              <div
                key={ep.id}
                onClick={() => onSelectEndpoint(ep.id)}
                className={`p-3 rounded-xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-sky-950/50 border-sky-500/50 text-slate-100 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/50 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono border ${getMethodBadgeClass(
                      ep.method
                    )}`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-semibold truncate text-slate-200">
                    {ep.path}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[150px] font-mono">{ep.handler_name}()</span>
                  <span className="uppercase text-[9px] font-bold text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {ep.framework}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
