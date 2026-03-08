import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Brain, Users, Sparkles, Shield, Zap } from 'lucide-react';
import { useEffect } from 'react';

export default function LoginPage() {
  const { login, isLoading, isAuthenticated, setMockUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const features = [
    { icon: Brain, title: t('login.feature1'), description: t('login.feature1Desc') },
    { icon: BookOpen, title: t('login.feature2'), description: t('login.feature2Desc') },
    { icon: Sparkles, title: t('login.feature3'), description: t('login.feature3Desc') },
    { icon: Users, title: t('login.feature4'), description: t('login.feature4Desc') },
  ];

  const stats = [
    { value: '1,200+', label: t('role.student'), icon: Users },
    { value: '50+', label: t('nav.courses'), icon: BookOpen },
    { value: '99.9%', label: 'Uptime', icon: Zap },
  ];

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-info/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '0.5s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col justify-between p-10 text-sidebar-foreground w-full">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/10">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">EduAssist</span>
          </div>

          <div>
            <h1 className="text-4xl xl:text-5xl font-bold mb-3 leading-[1.1] tracking-tight">
              {t('login.heroTitle1')}<br />
              <span className="gradient-text">{t('login.heroTitle2')}</span>
            </h1>
            <p className="text-base text-sidebar-foreground/60 mb-8 max-w-md leading-relaxed">{t('login.heroDesc')}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {features.map((feature) => (
                <div key={feature.title} className="p-3.5 rounded-xl bg-sidebar-accent/40 backdrop-blur-sm border border-sidebar-border/30 hover:bg-sidebar-accent/60 transition-all duration-300 hover:-translate-y-0.5 group">
                  <feature.icon className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-sm mb-0.5">{feature.title}</h3>
                  <p className="text-xs text-sidebar-foreground/50 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-sidebar-accent/40 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold">{stat.value}</p>
                  <p className="text-[11px] text-sidebar-foreground/50">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="w-full max-w-md relative z-10">
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">EduAssist</span>
          </div>

          <Card className="border-0 shadow-2xl shadow-primary/5 overflow-hidden">
            <div className="h-1 bg-gradient-primary" />
            <CardHeader className="text-center pb-2 pt-6">
              <CardTitle className="text-2xl tracking-tight">{t('login.welcome')}</CardTitle>
              <CardDescription className="mt-1">{t('login.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-3 pb-6">
              <Button variant="google" size="lg" className="w-full h-11" onClick={login} disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    {t('login.loading')}
                  </div>
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t('login.google')}
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground font-medium">{t('login.demoQuick')}</span></div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'admin' as const, label: 'Admin', icon: Shield, desc: t('login.admin'), color: 'hover:border-destructive/40 hover:bg-destructive/5' },
                  { role: 'teacher' as const, label: t('role.teacher'), icon: BookOpen, desc: t('login.teaching'), color: 'hover:border-primary/40 hover:bg-primary/5' },
                  { role: 'student' as const, label: t('role.student'), icon: GraduationCap, desc: t('login.learning'), color: 'hover:border-accent/40 hover:bg-accent/5' },
                ].map((item) => (
                  <Button key={item.role} variant="outline" className={`h-auto py-3.5 flex-col gap-1 transition-all duration-200 ${item.color}`} onClick={() => setMockUser(item.role)}>
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="text-xs font-semibold">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{item.desc}</span>
                  </Button>
                ))}
              </div>

              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                {t('login.terms')}{' '}
                <a href="#" className="text-primary hover:underline font-medium">{t('login.termsLink')}</a> {t('login.and')}{' '}
                <a href="#" className="text-primary hover:underline font-medium">{t('login.privacyLink')}</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
