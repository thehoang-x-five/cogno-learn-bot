/**
 * API Client with automatic token management
 * Automatically adds Authorization header and handles token refresh
 */

import * as authService from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiError {
  message: string;
  status: number;
  detail?: string;
}

/** Normalize fetch `ApiError` and legacy axios-style errors for user-facing messages */
export function getApiErrorDetail(error: unknown, fallback: string): string {
  if (error == null) return fallback;
  if (typeof error === 'string') return error;
  const e = error as ApiError & { response?: { data?: { detail?: string } } };
  if (typeof e.detail === 'string' && e.detail) return e.detail;
  const axiosDetail = e.response?.data?.detail;
  if (typeof axiosDetail === 'string' && axiosDetail) return axiosDetail;
  const msg = (error as Error).message;
  if (typeof msg === 'string' && msg) return msg;
  return fallback;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = authService.getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 - try to refresh token
  if (response.status === 401 && token) {
    const refreshed = await authService.refreshAccessToken();
    if (refreshed) {
      // Retry request with new token
      const newToken = authService.getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    } else {
      // Refresh failed - redirect to login
      authService.clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    const error: ApiError = {
      message: response.statusText,
      status: response.status,
    };

    try {
      const errorData = await response.json();
      error.detail = errorData.detail || errorData.message;
    } catch {
      // Response is not JSON
    }

    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

/**
 * GET request
 */
export async function get<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function post<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request
 */
export async function patch<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

/**
 * Upload file
 */
export async function upload<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = authService.getAccessToken();

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error: ApiError = {
      message: response.statusText,
      status: response.status,
    };

    try {
      const errorData = await response.json();
      error.detail = errorData.detail || errorData.message;
    } catch {
      // Response is not JSON
    }

    throw error;
  }

  return response.json();
}

// Default export for axios-like usage
const apiClient = {
  get: <T>(url: string, config?: { params?: any }) => {
    const queryString = config?.params ? '?' + new URLSearchParams(config.params).toString() : '';
    return get<T>(url + queryString).then(data => ({ data }));
  },
  post: <T>(url: string, data?: any, config?: { headers?: any }) => {
    if (config?.headers?.['Content-Type'] === 'multipart/form-data') {
      return upload<T>(url, data).then(data => ({ data }));
    }
    return post<T>(url, data).then(data => ({ data }));
  },
  put: <T>(url: string, data?: any) => put<T>(url, data).then(data => ({ data })),
  patch: <T>(url: string, data?: any) => patch<T>(url, data).then(data => ({ data })),
  delete: <T>(url: string) => del<T>(url).then(data => ({ data })),
};

export default apiClient;
