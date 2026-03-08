import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StatCard from '@/components/shared/StatCard';
import {
  Users, BookOpen, FileText, MessageSquare, TrendingUp,
  Activity, BarChart3, Bot, Cpu,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';

export default function AdminDashboard() {
  const { t, language } = useLanguage();

  const systemStats = [
    { name: t('admin.totalUsers'), value: '1,234', icon: Users, change: '+12%', iconColor: 'text-primary', iconBg: 'bg-primary/10' },
    { name: t('admin.activeCourses'), value: '48', icon: BookOpen, change: '+3', iconColor: 'text-accent', iconBg: 'bg-accent/10' },
    { name: t('admin.processedDocs'), value: '856', icon: FileText, change: '+24', iconColor: 'text-warning', iconBg: 'bg-warning/10' },
    { name: t('admin.conversations'), value: '5,678', icon: MessageSquare, change: '+156', iconColor: 'text-info', iconBg: 'bg-info/10' },
  ];

  const recentRegistrations = [
    { name: 'Nguyễn Văn H', email: 'h.nguyen@edu.vn', role: 'student' as const, time: t('admin.time.10m') },
    { name: 'Trần Thị K', email: 'k.tran@edu.vn', role: 'student' as const, time: t('admin.time.30m') },
    { name: 'Lê Văn M', email: 'm.le@edu.vn', role: 'teacher' as const, time: t('admin.time.2h') },
    { name: 'Phạm Thị N', email: 'n.pham@edu.vn', role: 'student' as const, time: t('admin.time.5h') },
  ];

  const systemHealth = [
    { name: 'API Server', status: 'online' as const, uptime: '99.9%', latency: '45ms' },
    { name: 'PostgreSQL', status: 'online' as const, uptime: '99.8%', latency: '12ms' },
    { name: 'Vector DB (pgvector)', status: 'online' as const, uptime: '99.7%', latency: '28ms' },
    { name: 'Celery Workers', status: 'online' as const, uptime: '99.5%', latency: '—' },
    { name: 'LLM API (OpenAI)', status: 'warning' as const, uptime: '98.2%', latency: '890ms' },
  ];

  const usageByDay = [
    { day: t('admin.day.mon'), chats: 120, quizzes: 45 },
    { day: t('admin.day.tue'), chats: 145, quizzes: 52 },
    { day: t('admin.day.wed'), chats: 198, quizzes: 67 },
    { day: t('admin.day.thu'), chats: 167, quizzes: 58 },
    { day: t('admin.day.fri'), chats: 210, quizzes: 73 },
    { day: t('admin.day.sat'), chats: 89, quizzes: 30 },
    { day: t('admin.day.sun'), chats: 56, quizzes: 18 },
  ];

  const userDistribution = [
    { name: t('role.student'), value: 1050, color: 'hsl(160, 84%, 39%)' },
    { name: t('role.teacher'), value: 150, color: 'hsl(234, 89%, 58%)' },
    { name: t('role.admin'), value: 34, color: 'hsl(0, 84%, 60%)' },
  ];

  const trafficData = [
    { time: '00:00', users: 12 }, { time: '04:00', users: 5 },
    { time: '08:00', users: 89 }, { time: '10:00', users: 234 },
    { time: '12:00', users: 156 }, { time: '14:00', users: 278 },
    { time: '16:00', users: 312 }, { time: '18:00', users: 198 },
    { time: '20:00', users: 145 }, { time: '22:00', users: 67 },
  ];

  const roleLabels: Record<string, string> = {
    admin: t('role.admin'), teacher: t('role.teacher'), student: t('role.student'),
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    fontSize: '12px',
    boxShadow: '0 8px 30px -8px hsl(var(--foreground) / 0.1)',
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
        {systemStats.map((stat) => (
          <StatCard
            key={stat.name}
            title={stat.name}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            subtitle={t('admin.comparedLastMonth')}
            iconColor={stat.iconColor}
            iconBg={stat.iconBg}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Usage Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {t('admin.usageByDay')}
                </CardTitle>
                <CardDescription className="mt-0.5">{t('admin.usageByDayDesc')}</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-normal">{t('admin.day.mon')} - {t('admin.day.sun')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={usageByDay} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="chats" name="Chat AI" fill="hsl(234, 89%, 58%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="quizzes" name="Quiz" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('admin.userDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={userDistribution} cx="50%" cy="50%"
                  innerRadius={58} outerRadius={82} paddingAngle={5} dataKey="value" strokeWidth={0}
                >
                  {userDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-5 -mt-2">
              {userDistribution.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Traffic Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              {t('admin.traffic')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(234, 89%, 58%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(234, 89%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="users" name={t('users.user')} stroke="hsl(234, 89%, 58%)" fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cpu className="h-4 w-4 text-primary" />
                  {t('admin.systemHealth')}
                </CardTitle>
                <CardDescription className="mt-0.5">{t('admin.serviceStatus')}</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                {t('admin.online')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {systemHealth.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${service.status === 'online' ? 'bg-accent' : 'bg-warning'}`} />
                  <span className="font-medium text-sm">{service.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">{service.uptime}</span>
                  <span className="w-12 text-right font-mono">{service.latency}</span>
                  <Badge variant="outline" className={`text-[10px] h-5 ${service.status === 'online' ? 'status-ready' : 'status-processing'}`}>
                    {service.status === 'online' ? t('admin.online') : t('admin.degraded')}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Registrations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('admin.recentRegistrations')}</CardTitle>
            <CardDescription>{t('admin.newUsersJoined')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRegistrations.map((user, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary group-hover:scale-105 transition-transform">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5">{roleLabels[user.role]}</Badge>
                  <span className="text-[11px] text-muted-foreground w-16 text-right">{user.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Token Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-4 w-4 text-primary" />
                  {t('admin.aiUsage')}
                </CardTitle>
                <CardDescription className="mt-0.5">{t('admin.aiUsageDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: 'GPT-4 Turbo', used: 245000, total: 500000 },
              { name: 'GPT-3.5 Turbo', used: 890000, total: 2000000 },
              { name: 'Embedding', used: 1200000, total: 5000000 },
            ].map((model) => (
              <div key={model.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {(model.used / 1000).toFixed(0)}K / {(model.total / 1000).toFixed(0)}K
                  </span>
                </div>
                <Progress value={(model.used / model.total) * 100} className="h-1.5" />
              </div>
            ))}
            <div className="pt-3 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('admin.estimatedCost')}</span>
              <span className="font-bold text-primary text-lg">$48.50</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
