import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Brain, Users, Sparkles } from 'lucide-react';
import { useEffect } from 'react';

export default function LoginPage() {
  const { login, isLoading, isAuthenticated, setMockUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    login();
  };

  const features = [
    {
      icon: Brain,
      title: 'Trợ lý AI thông minh',
      description: 'Hỏi đáp dựa trên tài liệu môn học thực tế',
    },
    {
      icon: BookOpen,
      title: 'Quản lý tài liệu',
      description: 'Upload và tổ chức slide, giáo trình dễ dàng',
    },
    {
      icon: Sparkles,
      title: 'Tạo Quiz tự động',
      description: 'AI tự động tạo câu hỏi ôn tập từ nội dung',
    },
    {
      icon: Users,
      title: 'Theo dõi tiến độ',
      description: 'Giáo viên theo dõi học tập của sinh viên',
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero section */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-sidebar-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold">EduAssist</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Hệ thống Trợ lý<br />
            <span className="gradient-text">Học tập AI</span>
          </h1>
          
          <p className="text-lg text-sidebar-foreground/70 mb-12 max-w-md">
            Ứng dụng RAG hỗ trợ sinh viên và giáo viên trong việc học tập và giảng dạy hiệu quả hơn.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-4 rounded-xl bg-sidebar-accent/50 backdrop-blur-sm border border-sidebar-border hover:bg-sidebar-accent/70 transition-colors"
              >
                <feature.icon className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-sidebar-foreground/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-3 rounded-xl bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold">EduAssist</span>
          </div>

          <Card className="border-0 shadow-2xl shadow-primary/5">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Đăng nhập</CardTitle>
              <CardDescription>
                Sử dụng tài khoản Google để đăng nhập vào hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <Button
                variant="google"
                size="lg"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Đang đăng nhập...
                  </div>
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Đăng nhập với Google
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Hoặc demo với vai trò
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMockUser('admin')}
                >
                  Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMockUser('teacher')}
                >
                  Giáo viên
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMockUser('student')}
                >
                  Sinh viên
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Bằng việc đăng nhập, bạn đồng ý với{' '}
                <a href="#" className="text-primary hover:underline">
                  Điều khoản sử dụng
                </a>{' '}
                và{' '}
                <a href="#" className="text-primary hover:underline">
                  Chính sách bảo mật
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
