// All API calls go through our Express backend (never expose keys in the browser)

const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ─── Health ───────────────────────────────────────────────────────────────────
export const checkHealth = () => apiCall('/health');

// ─── Claude AI Content Generation ─────────────────────────────────────────────
export const generateContent = (prompt, systemPrompt) =>
  apiCall('/generate', {
    method: 'POST',
    body: { prompt, systemPrompt },
  });

// ─── Facebook Publishing ──────────────────────────────────────────────────────
export const publishToFacebook = (content) =>
  apiCall('/publish', {
    method: 'POST',
    body: { content },
  });

// ─── Comments ─────────────────────────────────────────────────────────────────
export const fetchComments = (postId) => apiCall(`/comments/${postId}`);

export const replyToComment = (commentId, message) =>
  apiCall(`/comments/${commentId}/reply`, {
    method: 'POST',
    body: { message },
  });

// ─── Post Queue ───────────────────────────────────────────────────────────────
export const getQueue = () => apiCall('/queue');

export const addToQueue = (post) =>
  apiCall('/queue', {
    method: 'POST',
    body: post,
  });

export const removeFromQueue = (id) =>
  apiCall(`/queue/${id}`, { method: 'DELETE' });

// ─── Scheduler ────────────────────────────────────────────────────────────────
export const toggleScheduler = () =>
  apiCall('/scheduler/toggle', { method: 'POST' });

export const getSchedulerStatus = () => apiCall('/scheduler/status');
