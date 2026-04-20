import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { GraduationCap, Home, ArrowLeft, SearchX } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="text-center max-w-md animate-fade-in-up">
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl w-48 h-48 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />
          <div className="relative">
            <SearchX className="h-24 w-24 text-muted-foreground/30" strokeWidth={1} />
            <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        <h1 className="text-7xl font-black gradient-text mb-4">404</h1>
        <h2 className="text-xl font-semibold mb-2">{t('notFound.title')}</h2>
        <p className="text-muted-foreground mb-8">{t('notFound.desc')}</p>

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('action.back')}
          </Button>
          <Link to="/dashboard">
            <Button className="gap-2">
              <Home className="h-4 w-4" />
              {t('action.goHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
