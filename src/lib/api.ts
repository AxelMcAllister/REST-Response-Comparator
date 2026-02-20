import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

/**
 * Centralized HTTP client following best practices
 * - AbortController support for cleanup
 * - Request/response interceptors
 * - Error handling
 */
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    // Only access localStorage when needed (not on every render)
    try {
      const token = localStorage.getItem('token:v1')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // localStorage unavailable (incognito, disabled)
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      try {
        localStorage.removeItem('token:v1')
      } catch {
        // Ignore localStorage errors
      }
      // Redirect to login if needed
      // window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

/**
 * Fetch helper with AbortController support
 * Use this in useEffect cleanup to prevent memory leaks
 */
export function createAbortController(): AbortController {
  return new AbortController()
}

/**
 * Type-safe API request helper
 */
export async function apiRequest<T>(
  config: AxiosRequestConfig,
  signal?: AbortSignal
): Promise<T> {
  const response = await api.request<T>({ ...config, signal })
  return response.data
}
