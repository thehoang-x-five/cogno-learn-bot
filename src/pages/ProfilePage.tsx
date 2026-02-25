import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  User, Bell, Key, Clock, BookOpen,
  MessageSquare, ClipboardList, Save, Camera, Globe, Shield, Award,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const roleLabels = { admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Sinh viên' };

const activityLog = [
  { action: 'Đăng nhập hệ thống', time: '5 phút trước', type: 'auth' },
  { action: 'Chat AI - Hỏi về OOP', time: '1 giờ trước', type: 'chat' },
  { action: 'Hoàn thành Quiz Chương 2', time: '3 giờ trước', type: 'quiz' },
  { action: 'Xem tài liệu slide_chuong3.pdf', time: '5 giờ trước', type: 'doc' },
  { action: 'Đăng nhập hệ thống', time: '1 ngày trước', type: 'auth' },
];

const activityIcons: Record<string, React.ElementType> = {
  auth: Shield,
  chat: MessageSquare,
  quiz: ClipboardList,
  doc: BookOpen,
};

const activityColors: Record<string, string> = {
  auth: 'bg-info/10 text-info',
  chat: 'bg-primary/10 text-primary',
  quiz: 'bg-warning/10 text-warning',
  doc: 'bg-accent/10 text-accent',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email] = useState(user?.email || '');
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [quizNotif, setQuizNotif] = useState(true);

  const handleSave = () => {
    toast({ title: 'Đã cập nhật', description: 'Thông tin tài khoản đã được lưu.' });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto page-enter">
      <div>
        <h1 className="text-3xl font-bold">Tài khoản</h1>
        <p className="text-muted-foreground mt-1">Quản lý thông tin cá nhân và cài đặt</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Hồ sơ</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />Thông báo</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Clock className="h-4 w-4" />Hoạt động</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Card */}
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-primary" />
            <CardContent className="relative pt-0">
              <div className="flex items-end gap-6 -mt-12">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-card">
                    <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {user?.fullName?.charAt(0)}
                    </AvatarFallback>
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
                      Tham gia từ {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email liên kết với Google không thể thay đổi</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Lưu thay đổi
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-5 w-5" />
                Giao diện
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Chế độ tối</Label>
                  <p className="text-sm text-muted-foreground">Chuyển đổi giữa giao diện sáng và tối</p>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-5 w-5" />
                Thống kê hoạt động
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 stagger-children">
                {[
                  { icon: BookOpen, value: '6', label: 'Môn học', color: 'bg-primary/5 text-primary' },
                  { icon: MessageSquare, value: '89', label: 'Câu hỏi AI', color: 'bg-accent/5 text-accent' },
                  { icon: ClipboardList, value: '23', label: 'Quiz hoàn thành', color: 'bg-warning/5 text-warning' },
                  { icon: Clock, value: '48h', label: 'Thời gian học', color: 'bg-info/5 text-info' },
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
              <CardTitle className="text-base">Cài đặt thông báo</CardTitle>
              <CardDescription>Chọn loại thông báo bạn muốn nhận</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Thông báo Email</Label>
                  <p className="text-sm text-muted-foreground">Nhận thông báo quan trọng qua email</p>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Nhắc nhở Quiz</Label>
                  <p className="text-sm text-muted-foreground">Nhận thông báo khi có quiz mới hoặc sắp hết hạn</p>
                </div>
                <Switch checked={quizNotif} onCheckedChange={setQuizNotif} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nhật ký hoạt động</CardTitle>
              <CardDescription>Lịch sử hoạt động gần đây</CardDescription>
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
