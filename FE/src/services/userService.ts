import apiClient from './apiClient';
import type { User } from '@/types/course';

export const userService = {
  /**
   * List users with filters
   */
  async list(params?: {
    skip?: number;
    limit?: number;
    role?: 'admin' | 'teacher' | 'student';
    search?: string;
    is_active?: boolean;
  }): Promise<{
    items: User[];
    total: number;
    skip: number;
    limit: number;
  }> {
    const response = await apiClient.get<{
      items: User[];
      total: number;
      skip: number;
      limit: number;
    }>('/api/admin/users', { params });
    return response.data;
  },

  /**
   * Get user by ID
   */
  async getById(userId: number): Promise<User> {
    const response = await apiClient.get<User>(`/api/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Create user
   */
  async create(userData: {
    email: string;
    full_name?: string;
    role: 'admin' | 'teacher' | 'student';
    is_active?: boolean;
  }): Promise<User> {
    const response = await apiClient.post<User>('/api/admin/users', userData);
    return response.data;
  },

  /**
   * Update user
   */
  async update(userId: number, userData: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(`/api/admin/users/${userId}`, userData);
    return response.data;
  },

  /**
   * Delete user (soft delete - sets is_active to false)
   */
  async delete(userId: number): Promise<void> {
    await apiClient.delete(`/api/admin/users/${userId}`);
  },

  /**
   * Import users from Excel file
   */
  async importFromExcel(file: File): Promise<{
    success: number;
    failed: number;
    errors: string[];
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<{
      success: number;
      failed: number;
      errors: string[];
      message: string;
    }>('/api/admin/import/users', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
