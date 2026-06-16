import { getApiBase } from './baseUrl';

const BASE = getApiBase();

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

export async function getSuccessDistribution(opts = {}) {
  const { fromUtc, toUtc } = opts;
  const params = new URLSearchParams();
  if (fromUtc) params.set('fromUtc', fromUtc);
  if (toUtc) params.set('toUtc', toUtc);
  const qs = params.toString();
  const resp = await fetch(`${BASE}/Analytics/success-distribution${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
  const text = await resp.text();
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  const looksHtml = trimmed.startsWith('<') || (resp.headers.get('content-type') || '').includes('text/html');

  if (!resp.ok) {
    let msg = `Ошибка ${resp.status}`;
    try {
      const data = JSON.parse(trimmed);
      if (data.message) msg = data.message;
    } catch {
      if (looksHtml) {
        msg = 'Сервер вернул HTML вместо данных. Запустите API (dotnet run на порту 5233) или проверьте VITE_API_ORIGIN.';
      }
    }
    throw new Error(msg);
  }

  if (!trimmed) {
    throw new Error('Сервер вернул пустой ответ. Перезапустите API.');
  }
  if (looksHtml) {
    throw new Error('Вместо JSON пришла HTML-страница. В режиме разработки откройте API на http://localhost:5233 и задайте VITE_API_ORIGIN при другом порте.');
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`Ответ не похож на JSON. Убедитесь, что запущен этот проект API (часто http://localhost:5233). Начало ответа: ${trimmed.slice(0, 120)}`);
  }
}

export async function downloadAnalyticsExcel(opts = {}) {
  const { preset, fromUtc, toUtc } = opts;
  const params = new URLSearchParams();
  if (preset) params.set('preset', preset);
  if (fromUtc) params.set('fromUtc', fromUtc);
  if (toUtc) params.set('toUtc', toUtc);
  const qs = params.toString();
  const resp = await fetch(`${BASE}/Analytics/export${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
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
  let fileName = 'analytics.xlsx';
  const m = dispo?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i) || dispo?.match(/filename="([^"]+)"/);
  if (m) fileName = m[1].trim();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
