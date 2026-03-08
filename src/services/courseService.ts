import { mockCourses } from '@/data/mockData';
import { mockList, mockGet, mockCreate, mockUpdate, mockDelete, type ApiResponse } from './api';
import type { Course } from '@/types/course';

// Mutable copy for CRUD
let courses = [...mockCourses];

export const courseService = {
  list: (): Promise<ApiResponse<Course[]>> => mockList(courses),
  get: (id: string): Promise<ApiResponse<Course | null>> => mockGet(courses, id),
  create: (course: Course): Promise<ApiResponse<Course>> => mockCreate(courses, course),
  update: (id: string, patch: Partial<Course>): Promise<ApiResponse<Course | null>> => mockUpdate(courses, id, patch),
  delete: (id: string): Promise<ApiResponse<boolean>> => mockDelete(courses, id),
  /** Reset to initial data (for testing) */
  _reset: () => { courses = [...mockCourses]; },
};
