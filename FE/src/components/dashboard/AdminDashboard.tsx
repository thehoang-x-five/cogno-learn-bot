import { useEffect, useState, useMemo } from 'react';
import { parseBackendDate } from '@/utils/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/shared/StatCard';
import {
  Users, BookOpen, FileText, MessageSquare,
  Activity, BarChart3, Cpu,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import {
  adminService,
  type AdminStatistics,
  type AdminActivityResponse,
  type AdminTrafficTodayResponse,
  type RecentUsersResponse,
} from '@/services/adminService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function formatInt(n: number, locale: string) {
  return n.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
}

function formatSignupChange(thisM: number, lastM: number): { change?: string; trend: 'up' | 'down' | 'neutral' } {
  if (thisM === 0 && lastM === 0) return { trend: 'neutral' };
  if (lastM === 0) return { change: `+${thisM}`, trend: 'up' };
  const pct = Math.round(((thisM - lastM) / lastM) * 100);
  return { change: `${pct >= 0 ? '+' : ''}${pct}%`, trend: pct >= 0 ? 'up' : 'down' };
}

function shortWeekday(isoDate: string, locale: string) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' });
}

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const [stats, setStats] = useState<AdminStatistics | null>(null);
  const [activity, setActivity] = useState<AdminActivityResponse | null>(null);
  const [traffic, setTraffic] = useState<AdminTrafficTodayResponse | null>(null);
  const [recent, setRecent] = useState<RecentUsersResponse | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, a, tr, rc] = await Promise.all([
          adminService.getStatistics(),
          adminService.getActivity(7),
          adminService.getTrafficToday(),
          adminService.getRecentUsers(5),
        ]);
        if (!cancelled) {
          setStats(s);
          setActivity(a);
          setTraffic(tr);
          setRecent(rc);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((j) => setApiOnline(j?.status === 'healthy'))
      .catch(() => setApiOnline(false));
  }, []);

  const userChange = useMemo(() => {
    if (!stats) return { trend: 'neutral' as const };
    return formatSignupChange(stats.new_users_this_month, stats.new_users_last_month);
  }, [stats]);

  const systemStats = useMemo(() => {
    if (!stats) return [];
    const uc = formatSignupChange(stats.new_users_this_month, stats.new_users_last_month);
    return [
      {
        name: t('admin.totalUsers'),
        value: formatInt(stats.total_users, locale),
        icon: Users,
        change: uc.change,
        trend: uc.trend,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        subtitle: t('admin.comparedLastMonth'),
      },
      {
        name: t('admin.activeCourses'),
        value: formatInt(stats.total_courses, locale),
        icon: BookOpen,
        trend: 'neutral' as const,
        iconColor: 'text-accent',
        iconBg: 'bg-accent/10',
      },
      {
        name: t('admin.processedDocs'),
        value: formatInt(stats.documents_ready, locale),
        icon: FileText,
        trend: 'neutral' as const,
        iconColor: 'text-warning',
        iconBg: 'bg-warning/10',
      },
      {
        name: t('admin.conversations'),
        value: formatInt(stats.conversations_count, locale),
        icon: MessageSquare,
        trend: 'neutral' as const,
        iconColor: 'text-info',
        iconBg: 'bg-info/10',
      },
    ];
  }, [stats, t, locale]);

  const userDistribution = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t('role.student'), value: stats.total_students, color: 'hsl(160, 84%, 39%)' },
      { name: t('role.teacher'), value: stats.total_teachers, color: 'hsl(234, 89%, 58%)' },
      { name: t('role.admin'), value: stats.total_admins, color: 'hsl(0, 84%, 60%)' },
    ];
  }, [stats, t]);

  const usageByDay = useMemo(() => {
    if (!activity?.days?.length) return [];
    return activity.days.map((d) => ({
      day: shortWeekday(d.date, language),
      chats: d.messages_count,
      quizzes: d.quizzes_count,
    }));
  }, [activity, language]);

  const trafficData = useMemo(() => {
    if (!traffic?.hours?.length) return [];
    return traffic.hours.map((h) => ({
      time: h.hour,
      message_count: h.message_count,
    }));
  }, [traffic]);

  const roleLabels: Record<string, string> = {
    admin: t('role.admin'),
    teacher: t('role.teacher'),
    student: t('role.student'),
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    fontSize: '12px',
    boxShadow: '0 8px 30px -8px hsl(var(--foreground) / 0.1)',
  };

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse">
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/50" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center text-sm text-destructive">
          {error || t('admin.dashboardLoadError')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
        {systemStats.map((stat) => (
          <StatCard
            key={stat.name}
            title={stat.name}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            trend={stat.trend}
            subtitle={stat.subtitle}
            iconColor={stat.iconColor}
            iconBg={stat.iconBg}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
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
              <Badge variant="outline" className="text-xs font-normal">
                {t('admin.day.mon')} - {t('admin.day.sun')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={usageByDay} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="chats" name={t('admin.chartMessages')} fill="hsl(234, 89%, 58%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="quizzes" name={t('quiz.title')} fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('admin.userDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {userDistribution.some((u) => u.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={userDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={5}
                      dataKey="value"
                      strokeWidth={0}
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
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">{t('admin.noUserData')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              {t('admin.traffic')}
            </CardTitle>
            <CardDescription>{t('admin.trafficTodayDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="colorTrafficMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(234, 89%, 58%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(234, 89%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="message_count"
                  name={t('admin.chartMessages')}
                  stroke="hsl(234, 89%, 58%)"
                  fill="url(#colorTrafficMessages)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                <span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? 'bg-accent animate-pulse' : 'bg-destructive'}`} />
                {apiOnline ? t('admin.online') : t('admin.offline')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${apiOnline ? 'bg-accent' : 'bg-destructive'}`} />
                <span className="font-medium text-sm">API</span>
              </div>
              <Badge variant="outline" className={`text-[10px] h-5 ${apiOnline ? 'status-ready' : 'border-destructive/50 text-destructive'}`}>
                {apiOnline ? t('admin.online') : t('admin.offline')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground px-1">{t('admin.healthNote')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('admin.recentRegistrations')}</CardTitle>
          <CardDescription>{t('admin.newUsersJoined')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(recent?.items?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noRecentUsers')}</p>
          ) : (
            recent!.items.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary group-hover:scale-105 transition-transform">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5">
                    {roleLabels[user.role]}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground w-28 text-right">
                    {parseBackendDate(user.created_at).toLocaleString(locale)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
