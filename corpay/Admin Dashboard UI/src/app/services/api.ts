import axios from 'axios';

/**
 * Base URL for API: always ends with /api exactly once, no trailing slash.
 * - With VITE_API_URL set: `${VITE_API_URL}/api` (slashes normalized to avoid api//admin)
 * - With proxy (no VITE_API_URL): '/api'
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
  timeout: 120000, // 120s for large uploads and server wake-up
});

// Request path should NOT start with / so we get baseURL + '/' + path (e.g. /api/admin/auth/login)
export function apiPath(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  const base = getBaseURL();
  return base.endsWith('/') ? `${base}${p}` : `${base}/${p}`;
}
