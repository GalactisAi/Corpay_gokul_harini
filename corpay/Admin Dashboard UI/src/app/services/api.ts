import axios from 'axios';

/**
 * Base URL with /api exactly once: ${VITE_API_URL}/api (or '/api' when no env).
 * Use this for all API calls so the /api prefix is never missing or duplicated.
 */
export function getBaseURL(): string {
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

/** Origin only (no /api) for routes like /health that are mounted at root. */
export function getOrigin(): string {
  const base = import.meta.env.VITE_API_URL;
  if (base != null && String(base).trim() !== '') return String(base).replace(/\/+$/, '');
  return '';
}

// Request path should NOT start with / so we get baseURL + '/' + path (e.g. /api/admin/auth/login)
export function apiPath(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  const base = getBaseURL();
  return base.endsWith('/') ? `${base}${p}` : `${base}/${p}`;
}
