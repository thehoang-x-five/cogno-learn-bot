export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  semester: string;
  isActive: boolean;
  createdAt: string;
  enrollmentRole?: 'teacher' | 'student';
  teacherCount?: number;
  studentCount?: number;
  documentCount?: number;
}
