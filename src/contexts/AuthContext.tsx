import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { User, UserRole } from '@/types/user';
import { mockUsers } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  setMockUser: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
