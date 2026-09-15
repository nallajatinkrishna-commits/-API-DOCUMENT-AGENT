import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KeyDrawer from './components/KeyDrawer';
import UploadSection from './components/UploadSection';
import ProgressTimeline from './components/ProgressTimeline';
import EndpointSidebar from './components/EndpointSidebar';
import DocViewer from './components/DocViewer';
import { checkHealth, analyzeCode, uploadFileOrZip, generateDocs } from './utils/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [isKeyDrawerOpen, setIsKeyDrawerOpen] = useState(false);
  const [mode, setMode] = useState('template'); // 'template' or 'ai'

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(1);

  const [endpoints, setEndpoints] = useState([]);
  const [endpointDocs, setEndpointDocs] = useState([]);
  const [combinedMarkdown, setCombinedMarkdown] = useState('');
  const [combinedHtml, setCombinedHtml] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState(null);
  const [frameworksMap, setFrameworksMap] = useState({});
  const [modeUsed, setModeUsed] = useState('template');
  const [errorMsg, setErrorMsg] = useState(null);

  // Initial health check to set default mode if ANTHROPIC_API_KEY is configured on server
  useEffect(() => {
    checkHealth().then((res) => {
      if (res.anthropic_key_configured) {
        setMode('ai');
      }
    });
  }, []);

  const handleSaveKey = (key) => {
    setApiKey(key);
    if (key) setMode('ai');
  };

  const handleProcess = async ({ type, code, filename, file, framework, mode: selectedMode }) => {
    setErrorMsg(null);
    setIsProcessing(true);
    setProgressStep(1);

    try {
      // Step 1: Analyze Code
      let analyzeRes;
      if (type === 'file' && file) {
        analyzeRes = await uploadFileOrZip(file, framework);
      } else {
        analyzeRes = await analyzeCode(code, filename, framework);
      }

      const detectedEndpoints = analyzeRes.endpoints || [];
      setEndpoints(detectedEndpoints);
      setFrameworksMap(analyzeRes.frameworks_detected || {});

      if (detectedEndpoints.length === 0) {
        throw new Error('No API endpoints were detected in the provided source code.');
      }

      // Step 2: Parameters & Schema Extraction Complete
      setProgressStep(2);

      // Step 3: Generate Docs
      setProgressStep(3);
      const activeApiKey = apiKey || null;
      const genRes = await generateDocs(detectedEndpoints, activeApiKey, selectedMode);

      setEndpointDocs(genRes.endpoint_docs || []);
      setCombinedMarkdown(genRes.combined_markdown || '');
      setCombinedHtml(genRes.combined_html || '');
      setModeUsed(genRes.mode_used || selectedMode);

      if (detectedEndpoints.length > 0) {
        setSelectedEndpointId(detectedEndpoints[0].id);
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred during processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setEndpoints([]);
    setEndpointDocs([]);
    setCombinedMarkdown('');
    setSelectedEndpointId(null);
    setErrorMsg(null);
  };

  const selectedDoc = endpointDocs.find((d) => d.endpoint_id === selectedEndpointId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Header Bar */}
      <Header
        isAiActive={mode === 'ai' || Boolean(apiKey)}
        onOpenKeyDrawer={() => setIsKeyDrawerOpen(true)}
        onReset={handleReset}
      />

      {/* API Key Modal Drawer */}
      <KeyDrawer
        isOpen={isKeyDrawerOpen}
        onClose={() => setIsKeyDrawerOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
      />

      {/* Main App Body */}
      {isProcessing ? (
        <ProgressTimeline step={progressStep} />
      ) : endpoints.length > 0 ? (
        <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-61px)] overflow-hidden">
          {/* Left Sidebar list of detected routes */}
          <EndpointSidebar
            endpoints={endpoints}
            selectedEndpointId={selectedEndpointId}
            onSelectEndpoint={setSelectedEndpointId}
            frameworksMap={frameworksMap}
          />

          {/* Right Main Preview & Export Viewer */}
          <DocViewer
            selectedEndpointDoc={selectedDoc}
            combinedMarkdown={combinedMarkdown}
            combinedHtml={combinedHtml}
            modeUsed={modeUsed}
            onReset={handleReset}
          />
        </div>
      ) : (
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          {/* Error Banner */}
          {errorMsg && (
            <div className="max-w-4xl mx-auto mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center justify-between text-xs animate-shake">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="p-1 rounded-lg hover:bg-rose-900/50 text-rose-400"
              >
                &times;
              </button>
            </div>
          )}

          {/* Upload & Sample selector card */}
          <UploadSection
            onProcess={handleProcess}
            isAiConfigured={mode === 'ai' || Boolean(apiKey)}
            mode={mode}
            setMode={setMode}
          />
        </div>
      )}
    </div>
  );
}
