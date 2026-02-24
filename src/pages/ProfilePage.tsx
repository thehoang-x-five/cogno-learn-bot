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
  User, Mail, Shield, Bell, Key, Clock, BookOpen,
  MessageSquare, ClipboardList, Save, Camera, Globe,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const roleLabels = { admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Sinh viên' };

const activityLog = [
  { action: 'Đăng nhập hệ thống', time: '5 phút trước' },
  { action: 'Chat AI - Hỏi về OOP', time: '1 giờ trước' },
  { action: 'Hoàn thành Quiz Chương 2', time: '3 giờ trước' },
  { action: 'Xem tài liệu slide_chuong3.pdf', time: '5 giờ trước' },
  { action: 'Đăng nhập hệ thống', time: '1 ngày trước' },
];

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
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
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
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Cập nhật ảnh đại diện và thông tin cơ bản</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {user?.fullName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button size="icon" variant="outline" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full">
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{user?.fullName}</h3>
                  <Badge variant="outline" className="mt-1">
                    {roleLabels[user?.role || 'student']}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tham gia từ {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
              </div>
              <Separator />
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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

          {/* Stats summary */}
          <Card>
            <CardHeader>
              <CardTitle>Thống kê hoạt động</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 rounded-lg bg-primary/5">
                  <BookOpen className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">6</p>
                  <p className="text-xs text-muted-foreground">Môn học</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/5">
                  <MessageSquare className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold">89</p>
                  <p className="text-xs text-muted-foreground">Câu hỏi AI</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-warning/5">
                  <ClipboardList className="h-6 w-6 text-warning mx-auto mb-2" />
                  <p className="text-2xl font-bold">23</p>
                  <p className="text-xs text-muted-foreground">Quiz hoàn thành</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-info/5">
                  <Clock className="h-6 w-6 text-info mx-auto mb-2" />
                  <p className="text-2xl font-bold">48h</p>
                  <p className="text-xs text-muted-foreground">Thời gian học</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt thông báo</CardTitle>
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
              <CardTitle>Nhật ký hoạt động</CardTitle>
              <CardDescription>Lịch sử hoạt động gần đây</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityLog.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm">{log.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{log.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
