import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { GraduationCap } from 'lucide-react';
import AppSidebar from './AppSidebar';
import TopHeader from './TopHeader';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center ai-glow">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div className="absolute -inset-2 border-4 border-primary/20 rounded-3xl animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg font-semibold text-foreground">EduAssist</p>
            <p className="text-sm text-muted-foreground animate-pulse">{t('loading.text')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isChatPage = location.pathname === '/chat';

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isChatPage && <TopHeader />}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
