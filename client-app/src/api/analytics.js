const BASE = '/api';

function authHeaders() {
  const headers = {};
  try {
    const raw = sessionStorage.getItem('currentUser');
    if (raw) headers['X-User-Id'] = String(JSON.parse(raw).id);
  } catch { /* ignore */ }
  return headers;
}

export async function getAnalyticsDashboard() {
  const resp = await fetch(`${BASE}/Analytics/dashboard`, { headers: authHeaders() });
  if (!resp.ok) {
    let msg = `Ошибка ${resp.status}`;
    try {
      const data = await resp.json();
      msg = data.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return resp.json();
}

export async function getAnalyticsLearners() {
  const resp = await fetch(`${BASE}/Analytics/learners`, { headers: authHeaders() });
  if (!resp.ok) {
    let msg = `Ошибка ${resp.status}`;
    try {
      const data = await resp.json();
      msg = data.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return resp.json();
}

export async function getAnalyticsLearnerDetail(userId) {
  const resp = await fetch(`${BASE}/Analytics/learners/${userId}`, { headers: authHeaders() });
  if (!resp.ok) {
    let msg = `Ошибка ${resp.status}`;
    try {
      const data = await resp.json();
      msg = data.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return resp.json();
}

export async function downloadAnalyticsCsv() {
  const resp = await fetch(`${BASE}/Analytics/export`, { headers: authHeaders() });
  if (!resp.ok) {
    let msg = `Ошибка ${resp.status}`;
    try {
      const data = await resp.json();
      msg = data.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const blob = await resp.blob();
  const dispo = resp.headers.get('Content-Disposition');
  let fileName = 'analytics.csv';
  const m = dispo?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i) || dispo?.match(/filename="([^"]+)"/);
  if (m) fileName = m[1].trim();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
