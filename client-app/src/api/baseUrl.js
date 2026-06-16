/**
 * База URL для запросов к ASP.NET API.
 * - VITE_API_ORIGIN в .env — явный адрес (любой порт / хост).
 * - Vite dev (5173) и vite preview (4173) — иначе /api попадает на статику и приходит index.html вместо JSON.
 * - SPA с того же хоста, что и API (обычно dotnet + wwwroot, порт 5233) — относительный /api.
 */
export function getApiBase() {
  const explicit = import.meta.env.VITE_API_ORIGIN;
  if (explicit) {
    return `${String(explicit).replace(/\/$/, '')}/api`;
  }
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    const host = window.location.hostname;
    const h = host === '127.0.0.1' ? '127.0.0.1' : 'localhost';
    if (port === '5173' || port === '4173') {
      return `http://${h}:5233/api`;
    }
  }
  return '/api';
}
