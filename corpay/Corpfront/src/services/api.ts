import axios from 'axios'

// Use proxy (/api) in dev when VITE_API_URL not set; full URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const baseURL = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s - allow server wake-up and slow scrapes
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

