import apiClient from './apiClient';

export interface AdminStatistics {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_admins: number;
  total_courses: number;
  total_enrollments: number;
  documents_ready: number;
  conversations_count: number;
  messages_count: number;
  new_users_this_month: number;
  new_users_last_month: number;
}

export interface AdminActivityDay {
  date: string;
  messages_count: number;
  quizzes_count: number;
}

export interface AdminActivityResponse {
  days: AdminActivityDay[];
}

export interface AdminTrafficHour {
  hour: string;
  message_count: number;
}

export interface AdminTrafficTodayResponse {
  hours: AdminTrafficHour[];
}

export interface RecentUsersResponse {
  items: Array<{
    id: number;
    email: string;
    full_name: string | null;
    role: 'student' | 'teacher' | 'admin';
    created_at: string;
  }>;
}

export const adminService = {
  async getStatistics(): Promise<AdminStatistics> {
    const response = await apiClient.get<AdminStatistics>('/api/admin/statistics');
    return response.data;
  },

  async getActivity(days = 7): Promise<AdminActivityResponse> {
    const response = await apiClient.get<AdminActivityResponse>('/api/admin/dashboard/activity', {
      params: { days },
    });
    return response.data;
  },

  async getTrafficToday(): Promise<AdminTrafficTodayResponse> {
    const response = await apiClient.get<AdminTrafficTodayResponse>('/api/admin/dashboard/traffic-today');
    return response.data;
  },

  async getRecentUsers(limit = 5): Promise<RecentUsersResponse> {
    const response = await apiClient.get<RecentUsersResponse>('/api/admin/users/recent', {
      params: { limit },
    });
    return response.data;
  },

  async getUsers(params?: {
    skip?: number;
    limit?: number;
    role?: 'student' | 'teacher' | 'admin';
    search?: string;
    is_active?: boolean;
  }): Promise<{
    items: Array<{
      id: number;
      email: string;
      full_name: string | null;
      role: 'student' | 'teacher' | 'admin';
      is_active: boolean;
      created_at: string;
    }>;
    total: number;
    skip: number;
    limit: number;
  }> {
    const response = await apiClient.get('/api/admin/users', { params });
    return response.data;
  },
};
