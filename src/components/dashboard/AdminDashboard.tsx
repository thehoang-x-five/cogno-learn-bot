import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users, BookOpen, FileText, MessageSquare, TrendingUp,
  Server, Database, Bot, AlertCircle, CheckCircle2, Clock,
  Activity, BarChart3, Shield,
} from 'lucide-react';

const systemStats = [
  { name: 'Tổng người dùng', value: '1,234', icon: Users, change: '+12%', color: 'text-primary' },
  { name: 'Môn học hoạt động', value: '48', icon: BookOpen, change: '+3', color: 'text-accent' },
  { name: 'Tài liệu đã xử lý', value: '856', icon: FileText, change: '+24', color: 'text-warning' },
  { name: 'Cuộc hội thoại', value: '5,678', icon: MessageSquare, change: '+156', color: 'text-info' },
];

const recentRegistrations = [
  { name: 'Nguyễn Văn H', email: 'h.nguyen@edu.vn', role: 'student' as const, time: '10 phút trước' },
  { name: 'Trần Thị K', email: 'k.tran@edu.vn', role: 'student' as const, time: '30 phút trước' },
  { name: 'Lê Văn M', email: 'm.le@edu.vn', role: 'teacher' as const, time: '2 giờ trước' },
  { name: 'Phạm Thị N', email: 'n.pham@edu.vn', role: 'student' as const, time: '5 giờ trước' },
];

const systemHealth = [
  { name: 'API Server', status: 'online' as const, uptime: '99.9%', latency: '45ms' },
  { name: 'PostgreSQL', status: 'online' as const, uptime: '99.8%', latency: '12ms' },
  { name: 'Vector DB (pgvector)', status: 'online' as const, uptime: '99.7%', latency: '28ms' },
  { name: 'Celery Workers', status: 'online' as const, uptime: '99.5%', latency: '—' },
  { name: 'LLM API (OpenAI)', status: 'warning' as const, uptime: '98.2%', latency: '890ms' },
];

const usageByDay = [
  { day: 'T2', chats: 120, quizzes: 45 },
  { day: 'T3', chats: 145, quizzes: 52 },
  { day: 'T4', chats: 198, quizzes: 67 },
  { day: 'T5', chats: 167, quizzes: 58 },
  { day: 'T6', chats: 210, quizzes: 73 },
  { day: 'T7', chats: 89, quizzes: 30 },
  { day: 'CN', chats: 56, quizzes: 18 },
];

const maxChats = Math.max(...usageByDay.map(d => d.chats));

const roleLabels: Record<string, string> = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  student: 'Sinh viên',
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {systemStats.map((stat) => (
          <Card key={stat.name} className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-accent flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                {stat.change} so với tháng trước
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usage Chart (simple bar chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Hoạt động theo ngày
            </CardTitle>
            <CardDescription>Số lượng chat & quiz trong tuần</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {usageByDay.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-0.5">
                    <div
                      className="w-full bg-primary/80 rounded-t"
                      style={{ height: `${(d.chats / maxChats) * 120}px` }}
                    />
                    <div
                      className="w-full bg-accent/80 rounded-b"
                      style={{ height: `${(d.quizzes / maxChats) * 120}px` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-primary/80" />
                Chat AI
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-accent/80" />
                Quiz
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Sức khỏe hệ thống
            </CardTitle>
            <CardDescription>Trạng thái các dịch vụ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemHealth.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {service.status === 'online' ? (
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  <span className="font-medium text-sm">{service.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{service.uptime}</span>
                  <span>{service.latency}</span>
                  <Badge variant="outline" className={service.status === 'online' ? 'status-ready' : 'status-processing'}>
                    {service.status === 'online' ? 'Online' : 'Chậm'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle>Đăng ký gần đây</CardTitle>
            <CardDescription>Người dùng mới tham gia hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRegistrations.map((user, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {roleLabels[user.role]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{user.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Token Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Sử dụng Token AI
            </CardTitle>
            <CardDescription>Thống kê token tháng này</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">GPT-4 Turbo</span>
                <span className="text-sm font-medium">245,000 / 500,000</span>
              </div>
              <Progress value={49} className="h-2" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">GPT-3.5 Turbo</span>
                <span className="text-sm font-medium">890,000 / 2,000,000</span>
              </div>
              <Progress value={44.5} className="h-2" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Embedding</span>
                <span className="text-sm font-medium">1,200,000 / 5,000,000</span>
              </div>
              <Progress value={24} className="h-2" />
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Chi phí ước tính</span>
              <span className="font-semibold text-primary">$48.50</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
