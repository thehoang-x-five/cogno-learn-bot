import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  MessageSquare,
  FileText,
  ClipboardList,
  Users,
  TrendingUp,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// Mock data for stats
const adminStats = [
  { name: 'Tổng người dùng', value: '1,234', icon: Users, change: '+12%', color: 'text-primary' },
  { name: 'Môn học', value: '48', icon: BookOpen, change: '+3', color: 'text-accent' },
  { name: 'Tài liệu', value: '856', icon: FileText, change: '+24', color: 'text-warning' },
  { name: 'Cuộc hội thoại', value: '5,678', icon: MessageSquare, change: '+156', color: 'text-info' },
];

const teacherStats = [
  { name: 'Môn học của tôi', value: '5', icon: BookOpen, color: 'text-primary' },
  { name: 'Sinh viên', value: '234', icon: Users, color: 'text-accent' },
  { name: 'Tài liệu', value: '45', icon: FileText, color: 'text-warning' },
  { name: 'Quiz đã tạo', value: '12', icon: ClipboardList, color: 'text-info' },
];

const studentStats = [
  { name: 'Môn học', value: '6', icon: BookOpen, color: 'text-primary' },
  { name: 'Câu hỏi đã hỏi', value: '89', icon: MessageSquare, color: 'text-accent' },
  { name: 'Quiz hoàn thành', value: '23', icon: ClipboardList, color: 'text-warning' },
  { name: 'Điểm trung bình', value: '8.5', icon: Star, color: 'text-info' },
];

const recentCourses = [
  { id: '1', code: 'CS101', name: 'Nhập môn lập trình', progress: 75 },
  { id: '2', code: 'CS201', name: 'Cấu trúc dữ liệu', progress: 45 },
  { id: '3', code: 'CS301', name: 'Lập trình hướng đối tượng', progress: 90 },
];

const recentActivities = [
  { id: '1', text: 'Đã hỏi về OOP trong CS301', time: '5 phút trước', type: 'chat' },
  { id: '2', text: 'Hoàn thành Quiz Chương 2', time: '1 giờ trước', type: 'quiz' },
  { id: '3', text: 'Upload slide_chuong3.pdf', time: '2 giờ trước', type: 'document' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = user?.role === 'admin' ? adminStats : 
                user?.role === 'teacher' ? teacherStats : studentStats;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
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
        
        {user?.role !== 'admin' && (
          <Link to="/chat">
            <Button variant="gradient" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Chat với AI
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              {'change' in stat && stat.change && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  {String(stat.change)} so với tháng trước
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Courses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Môn học gần đây</CardTitle>
                <CardDescription>Tiến độ học tập của bạn</CardDescription>
              </div>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-1">
                  Xem tất cả
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{course.name}</p>
                  <p className="text-sm text-muted-foreground">{course.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{course.progress}%</p>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>Các hoạt động của bạn trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  activity.type === 'chat' ? 'bg-primary/10 text-primary' :
                  activity.type === 'quiz' ? 'bg-warning/10 text-warning' :
                  'bg-accent/10 text-accent'
                }`}>
                  {activity.type === 'chat' ? <MessageSquare className="h-4 w-4" /> :
                   activity.type === 'quiz' ? <ClipboardList className="h-4 w-4" /> :
                   <FileText className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.text}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Students */}
      {user?.role === 'student' && (
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Bắt đầu học ngay!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Hỏi AI bất kỳ câu hỏi nào về môn học của bạn
                </p>
              </div>
              <Link to="/chat">
                <Button variant="gradient" size="lg" className="gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Bắt đầu chat
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
