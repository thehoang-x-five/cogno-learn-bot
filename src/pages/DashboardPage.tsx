import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import TeacherDashboard from '@/components/dashboard/TeacherDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { user } = useAuth();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const roleLabel = user?.role === 'admin' ? 'Quản trị viên' : user?.role === 'teacher' ? 'Giáo viên' : 'Sinh viên';

  return (
    <div className="p-6 lg:p-8 space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {greeting()}, {user?.fullName?.split(' ').pop()}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'admin' ? 'Tổng quan hệ thống EduAssist' :
             user?.role === 'teacher' ? 'Quản lý môn học và theo dõi sinh viên' :
             'Tiếp tục hành trình học tập của bạn'}
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:flex gap-1.5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          {roleLabel}
        </Badge>
      </div>

      {/* Role-specific dashboard */}
      {user?.role === 'admin' && <AdminDashboard />}
      {user?.role === 'teacher' && <TeacherDashboard />}
      {user?.role === 'student' && <StudentDashboard />}
    </div>
  );
}
