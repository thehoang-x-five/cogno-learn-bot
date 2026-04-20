import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  GraduationCap, LayoutDashboard, BookOpen, MessageSquare, FileText,
  ClipboardList, Users, Settings, LogOut, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
    { name: t('nav.courses'), href: '/courses', icon: BookOpen, roles: ['admin', 'teacher', 'student'] },
    { name: t('nav.chat'), href: '/chat', icon: MessageSquare, roles: ['teacher', 'student'] },
    { name: t('nav.documents'), href: '/documents', icon: FileText, roles: ['admin', 'teacher'] },
    { name: t('nav.quizzes'), href: '/quizzes', icon: ClipboardList, roles: ['teacher', 'student'] },
    { name: t('nav.users'), href: '/users', icon: Users, roles: ['admin'] },
    { name: t('nav.settings'), href: '/settings', icon: Settings, roles: ['admin'] },
    { name: t('nav.profile'), href: '/profile', icon: User, roles: ['teacher', 'student'] },
  ];

  const filteredNavigation = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const roleLabel = user?.role === 'admin' ? t('role.admin') : user?.role === 'teacher' ? t('role.teacher') : t('role.student');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-sidebar-border">
          <SheetTitle className="flex items-center gap-3 text-sidebar-foreground">
            <div className="p-2 rounded-lg bg-primary/20">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold">EduAssist</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <ul className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 px-3 py-2.5',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">{user?.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.fullName}</p>
              <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
            </div>
          </div>
          <Separator className="bg-sidebar-border mb-3" />
          <button
            onClick={() => { onOpenChange(false); logout(); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
