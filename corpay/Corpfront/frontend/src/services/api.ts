import axios from 'axios'

// baseURL = ${VITE_API_URL}/api exactly once when set; else proxy /api
const raw = import.meta.env.VITE_API_URL ?? ''
const baseURL = raw.trim() ? `${String(raw).replace(/\/+$/, '')}/api` : '/api'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s — slow database wake-ups don't crash initial login
})

// Add token to requests if available
const token = localStorage.getItem('token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

