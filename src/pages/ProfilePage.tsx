import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  User, Bell, Clock, BookOpen,
  MessageSquare, ClipboardList, Save, Camera, Globe, Shield, Award,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email] = useState(user?.email || '');
  const [emailNotif, setEmailNotif] = useState(true);
  const [quizNotif, setQuizNotif] = useState(true);

  const roleLabels: Record<string, string> = {
    admin: t('role.admin'),
    teacher: t('role.teacher'),
    student: t('role.student'),
  };

  const activityLog = [
    { action: t('profile.act.login'), time: `5 ${t('time.minAgo')}`, type: 'auth' },
    { action: t('profile.act.chatOOP'), time: `1 ${t('time.hourAgo')}`, type: 'chat' },
    { action: t('profile.act.quizDone'), time: `3 ${t('time.hourAgo')}`, type: 'quiz' },
    { action: t('profile.act.viewDoc'), time: `5 ${t('time.hourAgo')}`, type: 'doc' },
    { action: t('profile.act.login'), time: `1 ${t('time.dayAgo')}`, type: 'auth' },
  ];

  const activityIcons: Record<string, React.ElementType> = { auth: Shield, chat: MessageSquare, quiz: ClipboardList, doc: BookOpen };
  const activityColors: Record<string, string> = { auth: 'bg-info/10 text-info', chat: 'bg-primary/10 text-primary', quiz: 'bg-warning/10 text-warning', doc: 'bg-accent/10 text-accent' };

  const handleSave = () => {
    toast({ title: t('toast.updated'), description: t('profile.savedDesc') });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-4xl mx-auto page-enter">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('profile.subtitle')}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />{t('profile.info')}</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />{t('profile.notifications')}</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Clock className="h-4 w-4" />{t('profile.activity')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-primary" />
            <CardContent className="relative pt-0">
              <div className="flex items-end gap-6 -mt-12">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-card">
                    <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">{user?.fullName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button size="icon" variant="outline" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-card">
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="pb-2">
                  <h3 className="text-xl font-semibold">{user?.fullName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{roleLabels[user?.role || 'student']}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {t('profile.joinedAt')} {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('profile.personalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('profile.fullName')}</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('profile.email')}</Label>
                  <Input id="email" value={email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">{t('profile.emailNote')}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  {t('action.save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-5 w-5" />
                {t('settings.appearance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('profile.darkMode')}</Label>
                  <p className="text-sm text-muted-foreground">{t('profile.darkModeDesc')}</p>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('profile.language')}</Label>
                  <p className="text-sm text-muted-foreground">{t('profile.languageDesc')}</p>
                </div>
                <Select value={language} onValueChange={(v) => setLanguage(v as 'vi' | 'en')}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-5 w-5" />
                {t('profile.activityStats')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 stagger-children">
                {[
                  { icon: BookOpen, value: '6', label: t('profile.courses'), color: 'bg-primary/5 text-primary' },
                  { icon: MessageSquare, value: '89', label: t('profile.aiQuestions'), color: 'bg-accent/5 text-accent' },
                  { icon: ClipboardList, value: '23', label: t('profile.quizCompleted'), color: 'bg-warning/5 text-warning' },
                  { icon: Clock, value: '48h', label: t('profile.studyTime'), color: 'bg-info/5 text-info' },
                ].map((stat) => (
                  <div key={stat.label} className={`text-center p-4 rounded-xl ${stat.color.split(' ')[0]}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color.split(' ')[1]} mx-auto mb-2`} />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('profile.notifSettings')}</CardTitle>
              <CardDescription>{t('profile.notifDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('profile.emailNotif')}</Label>
                  <p className="text-sm text-muted-foreground">{t('profile.emailNotifDesc')}</p>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('profile.quizReminder')}</Label>
                  <p className="text-sm text-muted-foreground">{t('profile.quizReminderDesc')}</p>
                </div>
                <Switch checked={quizNotif} onCheckedChange={setQuizNotif} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('profile.activityLog')}</CardTitle>
              <CardDescription>{t('profile.activityLogDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityLog.map((log, i) => {
                const Icon = activityIcons[log.type] || Clock;
                const colorClass = activityColors[log.type] || 'bg-muted text-muted-foreground';
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg ${colorClass} flex items-center justify-center`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{log.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{log.time}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
