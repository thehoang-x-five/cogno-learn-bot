import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  setMockUser: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Record<UserRole, User> = {
  admin: {
    id: '1',
    email: 'admin@edu.vn',
    fullName: 'Nguyễn Văn Admin',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  teacher: {
    id: '2',
    email: 'teacher@edu.vn',
    fullName: 'Trần Thị Giáo Viên',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
    role: 'teacher',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  student: {
    id: '3',
    email: 'student@edu.vn',
    fullName: 'Lê Văn Sinh Viên',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student',
    role: 'student',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = () => {
    setIsLoading(true);
    // Simulate OAuth flow - default to student for demo
    setTimeout(() => {
      setUser(mockUsers.student);
      setIsLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
  };

  const setMockUser = (role: UserRole) => {
    setUser(mockUsers[role]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setMockUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
