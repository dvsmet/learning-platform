import { getApiBase } from './baseUrl';

const BASE = getApiBase();

function getUserId() {
  try {
    const raw = sessionStorage.getItem('currentUser');
    if (raw) return JSON.parse(raw).id;
  } catch { /* ignore */ }
  return null;
}

export async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`;
  const headers = { ...options.headers };

  const uid = getUserId();
  if (uid) headers['X-User-Id'] = String(uid);

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const resp = await fetch(url, { ...options, headers });

  if (!resp.ok) {
    let msg = `Ошибка ${resp.status}`;
    try {
      const data = await resp.json();
      msg = data.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  if (resp.status === 204) return null;

  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}
