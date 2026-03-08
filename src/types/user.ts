export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  googleId?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}
