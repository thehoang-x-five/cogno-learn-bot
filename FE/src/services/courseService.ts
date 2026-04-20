import apiClient from './apiClient';
import type { Course, CourseDetail, CourseCreateWithEnrollments } from '@/types/course';

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  message: string;
}

export const courseService = {
  /**
   * List courses (auto-detect based on user role)
   * - For compatibility with useCourses hook
   */
  async list(params?: {
    skip?: number;
    limit?: number;
  }): Promise<{
    data: {
      items: Course[];
      total: number;
      skip: number;
      limit: number;
    };
    success: boolean;
    message?: string;
  }> {
    try {
      const result = await this.getMyCourses(params?.skip, params?.limit);
      return {
        data: result,
        success: true,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        data: { items: [], total: 0, skip: 0, limit: 0 },
        success: false,
        message: err.message || 'Failed to load courses',
      };
    }
  },

  /** Alias for `list` (e.g. DocumentsPage). */
  listCourses(params?: { skip?: number; limit?: number }) {
    return this.list(params);
  },

  /**
   * Get courses của user hiện tại
   * - Admin: tất cả courses
   * - Teacher/Student: courses mình tham gia
   */
  async getMyCourses(skip = 0, limit = 100): Promise<{
    items: Course[];
    total: number;
    skip: number;
    limit: number;
  }> {
    const response = await apiClient.get<{
      items: Course[];
      total: number;
      skip: number;
      limit: number;
    }>('/api/courses/my-courses', {
      params: { skip, limit }
    });
    return response.data;
  },

  /**
   * Get chi tiết course với teachers, students, documents
   */
  async getCourseDetail(courseId: number): Promise<CourseDetail> {
    const response = await apiClient.get<CourseDetail>(`/api/courses/${courseId}/detail`);
    return response.data;
  },

  /**
   * Check quyền upload document
   */
  async checkUploadPermission(courseId: number): Promise<{
    can_upload: boolean;
    role: string | null;
    message: string;
  }> {
    const response = await apiClient.get<{
      can_upload: boolean;
      role: string | null;
      message: string;
    }>(`/api/courses/${courseId}/can-upload`);
    return response.data;
  },

  // ============ Admin APIs ============

  /**
   * List all courses (Admin only)
   */
  async listAll(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
    semester?: string;
  }): Promise<{
    items: Course[];
    total: number;
    skip: number;
    limit: number;
  }> {
    const response = await apiClient.get<{
      items: Course[];
      total: number;
      skip: number;
      limit: number;
    }>('/api/admin/courses', { params });
    return response.data;
  },

  /**
   * Get course by ID (Admin only)
   */
  async getById(courseId: number): Promise<Course> {
    const response = await apiClient.get<Course>(`/api/admin/courses/${courseId}`);
    return response.data;
  },

  /**
   * Create course (simple, without enrollments)
   */
  async create(courseData: {
    code: string;
    name: string;
    description?: string;
    semester?: string;
    is_active?: boolean;
  }): Promise<Course> {
    const response = await apiClient.post<Course>('/api/admin/courses', courseData);
    return response.data;
  },

  /**
   * Create course with teachers and students
   */
  async createWithEnrollments(courseData: CourseCreateWithEnrollments): Promise<Course> {
    const response = await apiClient.post<Course>('/api/admin/courses/with-enrollments', courseData);
    return response.data;
  },

  /**
   * Update course
   */
  async update(courseId: number, courseData: Partial<Course>): Promise<Course> {
    const response = await apiClient.put<Course>(`/api/admin/courses/${courseId}`, courseData);
    return response.data;
  },

  /**
   * Delete course
   */
  async delete(courseId: number): Promise<void> {
    await apiClient.delete(`/api/admin/courses/${courseId}`);
  },

  /**
   * Import students into a course from Excel file.
   * Only the teacher of the course (or admin) can call this.
   * Required Excel column: email
   * Optional Excel column: full_name
   */
  async importStudents(courseId: number, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ImportResult>(
      `/api/courses/${courseId}/import-students`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  /**
   * Import courses from Excel file (Admin only)
   */
  async importFromExcel(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<ImportResult>(
      '/api/admin/import/courses',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // ============ Enrollment APIs ============

  /**
   * Add enrollment (Admin or Teacher of the course)
   */
  async addEnrollment(enrollmentData: {
    user_id: number;
    course_id: number;
    role: 'student' | 'teacher';
  }): Promise<any> {
    const response = await apiClient.post(
      `/api/courses/${enrollmentData.course_id}/enrollments`,
      enrollmentData
    );
    return response.data;
  },

  /**
   * Delete enrollment (Admin or Teacher of the course)
   */
  async deleteEnrollment(courseId: number, enrollmentId: number): Promise<void> {
    await apiClient.delete(`/api/courses/${courseId}/enrollments/${enrollmentId}`);
  },
};
