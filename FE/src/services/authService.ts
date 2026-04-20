/**
 * Authentication Service
 * Handles Google OAuth login, token management, and user authentication
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'teacher' | 'admin';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  /** Display aliases (synced from snake_case API fields) */
  fullName?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
}

function normalizeUser(raw: unknown): User {
  const r = raw as Record<string, unknown>;
  const full_name = r.full_name != null && r.full_name !== '' ? String(r.full_name) : null;
  const avatar_url = r.avatar_url != null && r.avatar_url !== '' ? String(r.avatar_url) : null;
  const created_at = r.created_at != null ? String(r.created_at) : undefined;
  const updated_at = r.updated_at != null ? String(r.updated_at) : undefined;
  return {
    id: Number(r.id),
    email: String(r.email),
    full_name,
    avatar_url,
    fullName: full_name,
    avatarUrl: avatar_url,
    created_at,
    updated_at,
    createdAt: created_at,
    role: r.role as User['role'],
    is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
  };
}

export function formatAuthApiError(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((e: { msg?: string }) => (typeof e?.msg === 'string' ? e.msg : null))
      .filter(Boolean);
    return parts.length ? parts.join('; ') : 'Validation error';
  }
  if (detail && typeof detail === 'object' && 'detail' in detail) {
    return formatAuthApiError((detail as { detail: unknown }).detail);
  }
  return 'Request failed';
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

// ============ Token Management ============

export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
};

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return normalizeUser(JSON.parse(userStr));
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User): void => {
  const normalized = normalizeUser(user);
  localStorage.setItem('user', JSON.stringify(normalized));
  localStorage.setItem('role', normalized.role);
};

// ============ API Calls ============

/**
 * Redirect to Google OAuth login
 */
export const loginWithGoogle = (): void => {
  window.location.href = `${API_URL}/api/auth/google/login`;
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<User> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token');
  }

  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return getCurrentUser(); // Retry with new token
      }
    }
    throw new Error('Failed to get user profile');
  }

  const raw = await response.json();
  const user = normalizeUser(raw);
  setStoredUser(user);
  return user;
};

export type UpdateMePayload = {
  full_name?: string | null;
  avatar_url?: string | null;
};

/**
 * PATCH /api/auth/me — cập nhật họ tên / avatar URL (không đổi email).
 */
export const updateMe = async (payload: UpdateMePayload): Promise<User> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token');
  }

  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return updateMe(payload);
      }
    }
    const errBody = await response.json().catch(() => ({}));
    throw new Error(formatAuthApiError((errBody as { detail?: unknown }).detail ?? errBody));
  }

  const raw = await response.json();
  const user = normalizeUser(raw);
  setStoredUser(user);
  return user;
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data: AuthResponse = await response.json();
    setTokens(data.access_token, data.refresh_token);
    setStoredUser(normalizeUser(data.user));
    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    clearTokens();
    return false;
  }
};

/**
 * Logout - revoke refresh token
 */
export const logout = async (): Promise<void> => {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

  if (token && refreshToken) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  clearTokens();
};

/**
 * Logout from all devices
 */
export const logoutAll = async (): Promise<void> => {
  const token = getAccessToken();

  if (token) {
    try {
      await fetch(`${API_URL}/api/auth/logout/all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout all error:', error);
    }
  }

  clearTokens();
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

/**
 * Get user role
 */
export const getUserRole = (): 'student' | 'teacher' | 'admin' | null => {
  const user = getStoredUser();
  return user?.role || null;
};

/**
 * Check if user has specific role
 */
export const hasRole = (role: 'student' | 'teacher' | 'admin'): boolean => {
  return getUserRole() === role;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roles: ('student' | 'teacher' | 'admin')[]): boolean => {
  const userRole = getUserRole();
  return userRole ? roles.includes(userRole) : false;
};
