import { useLocation, useNavigate } from 'react-router-dom';
import { parseBackendDate } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, Bell, Sun, Moon, ChevronRight, Settings, LogOut, User, Globe, Menu, GraduationCap,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/types/notification';
import {
  getNotificationHref,
  resolveDocumentNotificationHref,
} from '@/utils/notificationNavigation';

interface TopHeaderProps {
  onMenuClick?: () => void;
}

function RecentNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationService.list(),
    staleTime: 15_000,
  });
  const items = data?.items?.slice(0, 5) ?? [];

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await notificationService.markRead(n.id);
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
    if (n.related_type === 'document' && n.related_id) {
      try {
        const href = await resolveDocumentNotificationHref(n.related_id, user?.role);
        navigate(href);
      } catch {
        navigate('/notifications');
      }
      return;
    }
    const path = getNotificationHref(n);
    if (path) navigate(path);
  };

  if (!items.length) {
    return (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        Không có thông báo nào
      </div>
    );
  }

  return (
    <>
      {items.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => handleClick(n)}
          className={`w-full text-left flex flex-col gap-0.5 px-3 py-2.5 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm flex-1 leading-snug">{n.title}</span>
            {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
          </div>
          <span className="text-xs text-muted-foreground">{n.message}</span>
          <span className="text-[10px] text-muted-foreground/60">
            {parseBackendDate(n.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </button>
      ))}
    </>
  );
}

export default function TopHeader({ onMenuClick }: TopHeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifCount } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationService.count,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const unreadCount = notifCount?.unread ?? 0;

  const breadcrumbMap: Record<string, string> = {
    '/dashboard': t('breadcrumb.dashboard'),
    '/courses': t('breadcrumb.courses'),
    '/chat': t('breadcrumb.chat'),
    '/documents': t('breadcrumb.documents'),
    '/quizzes': t('breadcrumb.quizzes'),
    '/users': t('breadcrumb.users'),
    '/settings': t('breadcrumb.settings'),
    '/profile': t('breadcrumb.profile'),
  };

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((_, i) => {
    const path = '/' + pathSegments.slice(0, i + 1).join('/');
    return { label: breadcrumbMap[path] || pathSegments[i], path };
  });

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
      {/* Left: hamburger + breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {isMobile ? (
          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap className="h-5 w-5 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">
              {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : 'EduAssist'}
            </span>
          </div>
        ) : (
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
                <span className={i === breadcrumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Search - hidden on mobile */}
        {!isMobile && (
          <>
            <div className={`transition-all duration-300 overflow-hidden ${searchOpen ? 'w-64' : 'w-0'}`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('action.search')}
                  className="h-8 pl-9 text-sm"
                  onBlur={() => setSearchOpen(false)}
                  autoFocus={searchOpen}
                />
              </div>
            </div>
            {!searchOpen && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSearchOpen(true)}>
                <Search className="h-4 w-4" />
              </Button>
            )}
          </>
        )}

        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setLanguage('vi')} className={language === 'vi' ? 'bg-primary/10 text-primary' : ''}>
              🇻🇳 Tiếng Việt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-primary/10 text-primary' : ''}>
              🇺🇸 English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => {
          if (open) {
            // Refresh count and list when dropdown opens
            queryClient.invalidateQueries({ queryKey: ['notif-count'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="px-3 py-2 border-b flex items-center justify-between">
              <p className="font-semibold text-sm">{t('notif.title')}</p>
              {unreadCount > 0 && (
                <button
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => {
                    notificationService.markAllRead().then(() => {
                      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
                      queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    });
                  }}
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              <RecentNotifications />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/notifications')} className="justify-center text-primary text-xs font-medium cursor-pointer">
              {t('notif.viewAll')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu - hidden on mobile (accessible via sidebar) */}
        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-2 pl-2 pr-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {user?.fullName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline">{user?.fullName?.split(' ').pop()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                {t('nav.profile')}
              </DropdownMenuItem>
              {user?.role === 'admin' && (
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('nav.settings')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
