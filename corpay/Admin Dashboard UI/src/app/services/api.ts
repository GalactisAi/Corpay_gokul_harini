import axios from 'axios';

/**
 * Base URL with /api exactly once: ${VITE_API_URL}/api (or '/api' when no env).
 * Use for all API calls so the final URL is .../api/admin/... (not .../admin/... or .../api/api/...).
 */
export function getBaseURL(): string {
  const base = import.meta.env.VITE_API_URL;
  if (base != null && String(base).trim() !== '') {
    const trimmed = String(base).replace(/\/+$/, '');
    return trimmed ? `${trimmed}/api` : '/api';
  }
  return '/api';
}

/** Alias for login and other services: base for POST/GET (e.g. .../api). */
export const apiBaseURL = getBaseURL();

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
