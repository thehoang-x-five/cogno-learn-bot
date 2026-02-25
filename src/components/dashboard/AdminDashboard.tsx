import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users, BookOpen, FileText, MessageSquare, TrendingUp,
  AlertCircle, CheckCircle2,
  Activity, BarChart3, Bot,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';

const systemStats = [
  { name: 'Tổng người dùng', value: '1,234', icon: Users, change: '+12%', color: 'text-primary', bg: 'bg-primary/10' },
  { name: 'Môn học hoạt động', value: '48', icon: BookOpen, change: '+3', color: 'text-accent', bg: 'bg-accent/10' },
  { name: 'Tài liệu đã xử lý', value: '856', icon: FileText, change: '+24', color: 'text-warning', bg: 'bg-warning/10' },
  { name: 'Cuộc hội thoại', value: '5,678', icon: MessageSquare, change: '+156', color: 'text-info', bg: 'bg-info/10' },
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

const userDistribution = [
  { name: 'Sinh viên', value: 1050, color: 'hsl(160, 84%, 39%)' },
  { name: 'Giáo viên', value: 150, color: 'hsl(234, 89%, 58%)' },
  { name: 'Admin', value: 34, color: 'hsl(0, 84%, 60%)' },
];

const trafficData = [
  { time: '00:00', users: 12 }, { time: '04:00', users: 5 },
  { time: '08:00', users: 89 }, { time: '10:00', users: 234 },
  { time: '12:00', users: 156 }, { time: '14:00', users: 278 },
  { time: '16:00', users: 312 }, { time: '18:00', users: 198 },
  { time: '20:00', users: 145 }, { time: '22:00', users: 67 },
];

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
          <Card key={stat.name} className="hover-lift overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Usage Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Hoạt động theo ngày
            </CardTitle>
            <CardDescription>Số lượng chat & quiz trong tuần</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={usageByDay} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="chats" name="Chat AI" fill="hsl(234, 89%, 58%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quizzes" name="Quiz" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ người dùng</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {userDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traffic Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Lưu lượng truy cập hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(234, 89%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(234, 89%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="users" name="Người dùng" stroke="hsl(234, 89%, 58%)" fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
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
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                    </span>
                  ) : (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning" />
                    </span>
                  )}
                  <span className="font-medium text-sm">{service.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{service.uptime}</span>
                  <span className="w-12 text-right">{service.latency}</span>
                  <Badge variant="outline" className={`text-[10px] ${service.status === 'online' ? 'status-ready' : 'status-processing'}`}>
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
