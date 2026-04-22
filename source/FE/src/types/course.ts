export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  semester?: string;
  is_active: boolean;
  created_at: string;
  teacher_count: number;
  student_count: number;
  document_count: number;
  /** Optional: present in some list payloads */
  enrollmentRole?: 'teacher' | 'student';
}

export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: 'admin' | 'teacher' | 'student';
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CourseDetail extends Course {
  teacher_count: number;
  student_count: number;
  document_count: number;
  teachers: User[];
  students: User[];
  enrollments: Array<{
    enrollment_id: number;
    user_id: number;
    role: 'teacher' | 'student';
  }>;
}

export interface CourseCreateWithEnrollments {
  code: string;
  name: string;
  description?: string;
  semester?: string;
  is_active?: boolean;
  teacher_ids: number[];
  student_ids: number[];
}
