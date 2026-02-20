import axios from 'axios';

/**
 * Base URL for API: exactly ${VITE_API_URL}/api so every request has /api exactly once (avoids 404s).
 * - With VITE_API_URL set: `${VITE_API_URL}/api` (no trailing slash on env)
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
  timeout: 120000, // 2 minutes for large PDF/Excel processing
});

// Request path should NOT start with / so we get baseURL + '/' + path (e.g. /api/admin/auth/login)
export function apiPath(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  const base = getBaseURL();
  return base.endsWith('/') ? `${base}${p}` : `${base}/${p}`;
}
