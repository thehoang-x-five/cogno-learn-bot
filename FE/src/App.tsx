import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import MainLayout from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import DashboardPage from "@/pages/DashboardPage";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import MyCoursesPage from "@/pages/MyCoursesPage";
import ChatPage from "@/pages/ChatPage";
import DocumentsPage from "@/pages/DocumentsPage";
import QuizzesPage from "@/pages/QuizzesPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import NotificationsPage from "@/pages/NotificationsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                
                {/* Protected routes - All roles */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <MainLayout><DashboardPage /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <MainLayout><ProfilePage /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <MainLayout><SettingsPage /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <MainLayout><NotificationsPage /></MainLayout>
                  </ProtectedRoute>
                } />
                
                {/* Protected routes - Students and Teachers */}
                <Route path="/my-courses" element={
                  <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                    <MainLayout><MyCoursesPage /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/courses" element={
                  <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                    <MainLayout><CoursesPage /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/courses/:courseId" element={
                  <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                    <MainLayout><CourseDetailPage /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute allowedRoles={['student', 'teacher']}>
                    <MainLayout><ChatPage /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/quizzes" element={
                  <ProtectedRoute allowedRoles={['student', 'teacher']}>
                    <MainLayout><QuizzesPage /></MainLayout>
                  </ProtectedRoute>
                } />
                
                {/* Protected routes - Teachers and Admin */}
                <Route path="/documents" element={
                  <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                    <MainLayout><DocumentsPage /></MainLayout>
                  </ProtectedRoute>
                } />
                
                {/* Protected routes - Admin only */}
                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <MainLayout><UsersPage /></MainLayout>
                  </ProtectedRoute>
                } />
                
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
