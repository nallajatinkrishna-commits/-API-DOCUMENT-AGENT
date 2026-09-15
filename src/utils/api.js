const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return {
      status: 'error',
      anthropic_key_configured: false,
      default_mode: 'template',
      parsers: ['fastapi', 'flask', 'express']
    };
  }
}

export async function analyzeCode(code, filename = 'app.py', framework = 'auto') {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, filename, framework })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Code analysis failed');
  }
  return await res.json();
}

export async function uploadFileOrZip(file, framework = 'auto') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('framework', framework);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'File upload failed');
  }
  return await res.json();
}

export async function generateDocs(endpoints, apiKey = null, mode = 'template') {
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoints, api_key: apiKey, mode })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Doc generation failed');
  }
  return await res.json();
}

export async function analyzeAndGenerate(code, filename = 'app.py', framework = 'auto', apiKey = null, mode = 'template') {
  const res = await fetch(`${API_BASE}/analyze-and-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, filename, framework, api_key: apiKey, mode })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Pipeline execution failed');
  }
  return await res.json();
}

export function downloadExport(markdownContent, format = 'md') {
  const encoded = encodeURIComponent(markdownContent);
  const url = `${API_BASE}/export?format=${format}&markdown_content=${encoded}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = format === 'html' ? 'api_documentation.html' : 'api_documentation.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
