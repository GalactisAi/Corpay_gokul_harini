import axios from 'axios'

// baseURL = ${VITE_API_URL}/api exactly once — all calls (login and data) use correct /api prefix
const raw = import.meta.env.VITE_API_URL ?? ''
const baseURL = raw.trim() ? `${String(raw).replace(/\/+$/, '')}/api` : '/api'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s — slow database wake-ups don't crash initial login
})

// Dashboard API functions
export const dashboardApi = {
  getRevenue: () => api.get('/dashboard/revenue'),
  getSharePrice: () => api.get('/dashboard/share-price'),
  getRevenueTrends: () => api.get('/dashboard/revenue-trends'),
  getRevenueProportions: () => api.get('/dashboard/revenue-proportions'),
  getPosts: (limit = 10) => api.get('/dashboard/posts', { params: { limit } }),
  getCrossBorderPosts: (limit = 10) => api.get('/dashboard/cross-border-posts', { params: { limit } }),
  getEmployees: (limit = 20) => api.get('/dashboard/employees', { params: { limit } }),
  getPayments: () => api.get('/dashboard/payments'),
  getSystemPerformance: () => api.get('/dashboard/system-performance'),
  getNewsroom: (limit = 12) => api.get('/dashboard/newsroom', { params: { limit } }),
  getResourcesNewsroom: (limit = 4) => api.get('/dashboard/resources-newsroom', { params: { limit } }),
  getCustomerStories: (limit = 12) => api.get('/dashboard/customer-stories', { params: { limit } }),
  getCardTitles: () => api.get(`/dashboard/card-titles?t=${Date.now()}`),
}

