import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import TeacherDashboard from '@/components/dashboard/TeacherDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  const roleLabel = user?.role === 'admin' ? t('role.admin') : user?.role === 'teacher' ? t('role.teacher') : t('role.student');
  const subtitle = user?.role === 'admin' ? t('dashboard.admin.subtitle') : user?.role === 'teacher' ? t('dashboard.teacher.subtitle') : t('dashboard.student.subtitle');

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {greeting()}, {user?.fullName?.split(' ').pop()}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        </div>
        <Badge variant="outline" className="hidden sm:flex gap-1.5 px-3 py-1.5 shrink-0">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          {roleLabel}
        </Badge>
      </div>

      {user?.role === 'admin' && <AdminDashboard />}
      {user?.role === 'teacher' && <TeacherDashboard />}
      {user?.role === 'student' && <StudentDashboard />}
    </div>
  );
}
