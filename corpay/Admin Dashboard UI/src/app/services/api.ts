import axios from 'axios';

/**
 * baseURL = ${VITE_API_URL}/api exactly once — login and data calls use correct /api prefix.
 * With proxy (no VITE_API_URL): '/api'
 */
function getBaseURL(): string {
  const base = import.meta.env.VITE_API_URL;
  if (base != null && String(base).trim() !== '') {
    const trimmed = String(base).replace(/\/+$/, '');
    return trimmed ? `${trimmed}/api` : '/api';
  }
  return '/api';
}

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s — slow database wake-ups don't crash initial login
});

// Request path should NOT start with / so we get baseURL + '/' + path (e.g. /api/admin/auth/login)
export function apiPath(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  const base = getBaseURL();
  return base.endsWith('/') ? `${base}${p}` : `${base}/${p}`;
}
