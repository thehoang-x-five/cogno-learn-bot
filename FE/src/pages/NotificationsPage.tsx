import { useNavigate } from 'react-router-dom';
import { parseBackendDate } from '@/utils/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, ClipboardList, FileText, CheckCheck, Trash2, BookOpen, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import LoadingState from '@/components/shared/LoadingState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/types/notification';
import {
  getNotificationHref,
  resolveDocumentNotificationHref,
} from '@/utils/notificationNavigation';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  quiz:        { icon: ClipboardList, color: 'text-warning',     bg: 'bg-warning/10' },
  document:    { icon: FileText,      color: 'text-info',        bg: 'bg-info/10' },
  enrollment:  { icon: BookOpen,      color: 'text-accent',      bg: 'bg-accent/10' },
  course_staff:{ icon: BookOpen,      color: 'text-primary',     bg: 'bg-primary/10' },
  system:      { icon: AlertCircle,   color: 'text-destructive', bg: 'bg-destructive/10' },
};

const defaultConfig = { icon: Bell, color: 'text-primary', bg: 'bg-primary/10' };

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list(),
    staleTime: 10_000,
  });

  const allNotifs: Notification[] = data?.items ?? [];
  const unreadCount = allNotifs.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
      toast({ title: 'Đã đánh dấu tất cả đã đọc' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
      toast({ title: 'Đã xóa thông báo' });
    },
  });

  const handleClick = async (n: Notification) => {
    if (!n.is_read) markReadMutation.mutate(n.id);
    if (n.related_type === 'document' && n.related_id) {
      try {
        const href = await resolveDocumentNotificationHref(n.related_id, user?.role);
        navigate(href);
      } catch {
        toast({
          title: 'Không mở được tài liệu',
          description: 'Không tải được thông tin tài liệu hoặc bạn không có quyền.',
          variant: 'destructive',
        });
      }
      return;
    }
    const path = getNotificationHref(n);
    if (path) navigate(path);
  };

  const filterNotifications = (tab: string): Notification[] => {
    if (tab === 'all')        return allNotifs;
    if (tab === 'unread')     return allNotifs.filter((n) => !n.is_read);
    if (tab === 'enrollment') return allNotifs.filter((n) => n.type === 'enrollment' || n.type === 'course_staff');
    return allNotifs.filter((n) => n.type === tab);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <LoadingState variant="list" count={6} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            {t('notif.title')}
            {unreadCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground h-6 px-2.5 text-xs">
                {unreadCount} mới
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý tất cả thông báo của bạn</p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => markAllReadMutation.mutate()}
          disabled={unreadCount === 0 || markAllReadMutation.isPending}
          className="gap-2"
        >
          <CheckCheck className="h-4 w-4" />
          Đánh dấu đã đọc
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-secondary/50 dark:bg-secondary/30">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="unread">
            Chưa đọc
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] ml-1">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="quiz" className="hidden sm:flex">Quiz</TabsTrigger>
          <TabsTrigger value="document" className="hidden sm:flex">Tài liệu</TabsTrigger>
          <TabsTrigger value="enrollment" className="hidden sm:flex">Môn học</TabsTrigger>
        </TabsList>

        {(['all', 'unread', 'quiz', 'document', 'enrollment'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-2">
            {filterNotifications(tab).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Bell className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">Không có thông báo nào</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Bạn đã đọc hết tất cả thông báo</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y divide-border/40">
                  {filterNotifications(tab).map((notif) => {
                    const config = typeConfig[notif.type] ?? defaultConfig;
                    const Icon = config.icon;
                    const navigable = !!getNavigatePath(notif);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleClick(notif)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleClick(notif)}
                        className={cn(
                          'flex items-start gap-4 p-4 sm:p-5 transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none',
                          navigable ? 'cursor-pointer' : 'cursor-default',
                          !notif.is_read
                            ? 'bg-primary/[0.03] dark:bg-primary/[0.06] hover:bg-primary/[0.06]'
                            : 'hover:bg-muted/40'
                        )}
                      >
                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', config.bg)}>
                          <Icon className={cn('h-5 w-5', config.color)} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn('text-sm leading-tight', !notif.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{notif.message}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground/60">
                              {parseBackendDate(notif.created_at).toLocaleString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize">
                              {notif.type === 'course_staff' ? 'giảng viên' : notif.type}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
