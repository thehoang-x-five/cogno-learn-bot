import { useState } from 'react';
import { User, UserRole } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users, UserPlus, Search, MoreVertical, Edit, Trash2, Shield, GraduationCap, BookOpen, CheckCircle2, XCircle, Mail,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import EditDialog, { EditField } from '@/components/shared/EditDialog';

const initialUsers: User[] = [
  { id: '1', email: 'admin@edu.vn', fullName: 'Nguyễn Văn Admin', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', role: 'admin', isActive: true, createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
  { id: '2', email: 'teacher1@edu.vn', fullName: 'Trần Thị Giáo Viên', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher1', role: 'teacher', isActive: true, createdAt: new Date(Date.now() - 180 * 86400000).toISOString() },
  { id: '3', email: 'teacher2@edu.vn', fullName: 'Lê Văn Giảng', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher2', role: 'teacher', isActive: true, createdAt: new Date(Date.now() - 120 * 86400000).toISOString() },
  { id: '4', email: 'student1@edu.vn', fullName: 'Phạm Minh Sinh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1', role: 'student', isActive: true, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: '5', email: 'student2@edu.vn', fullName: 'Hoàng Thị Học', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student2', role: 'student', isActive: true, createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: '6', email: 'student3@edu.vn', fullName: 'Võ Văn Viên', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student3', role: 'student', isActive: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

export default function UsersPage() {
  const { t, language } = useLanguage();
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', fullName: '', role: 'student' as UserRole });
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<User | null>(null);

  const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; className: string }> = {
    admin: { label: t('role.admin'), icon: Shield, className: 'bg-destructive/10 text-destructive border-destructive/20' },
    teacher: { label: t('role.teacher'), icon: BookOpen, className: 'bg-primary/10 text-primary border-primary/20' },
    student: { label: t('role.student'), icon: GraduationCap, className: 'bg-accent/10 text-accent border-accent/20' },
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && user.isActive) || (statusFilter === 'inactive' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    teachers: users.filter((u) => u.role === 'teacher').length,
    students: users.filter((u) => u.role === 'student').length,
    active: users.filter((u) => u.isActive).length,
  };

  const handleAddUser = () => {
    if (!newUser.fullName || !newUser.email) {
      toast({ title: t('users.missingInfo'), description: t('users.fillRequired'), variant: 'destructive' });
      return;
    }
    const user: User = {
      id: Date.now().toString(), email: newUser.email, fullName: newUser.fullName,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.email}`,
      role: newUser.role, isActive: true, createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, user]);
    setIsAddDialogOpen(false);
    setNewUser({ email: '', fullName: '', role: 'student' });
    toast({ title: t('toast.added'), description: `${user.fullName} ${t('toast.addedToSystem')}.` });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    toast({ title: t('toast.deleted'), description: `${t('users.user')} "${deleteTarget.fullName}" ${t('toast.deleted').toLowerCase()}.` });
    setDeleteTarget(null);
  };

  const handleEditSave = (values: Record<string, string>) => {
    if (!editTarget) return;
    setUsers((prev) => prev.map((u) => u.id === editTarget.id ? { ...u, fullName: values.fullName, email: values.email } : u));
    toast({ title: t('toast.updated'), description: `"${values.fullName}" ${t('toast.updated').toLowerCase()}.` });
    setEditTarget(null);
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    const user = users.find((u) => u.id === userId);
    toast({ title: t('toast.roleChanged'), description: `${user?.fullName} → ${roleConfig[newRole].label}.` });
    setRoleChangeTarget(null);
  };

  const handleToggleStatus = (userId: string) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    const user = users.find((u) => u.id === userId);
    toast({ title: t('toast.updated'), description: `${user?.fullName} ${user?.isActive ? t('users.deactivated') : t('users.activated')}.` });
  };

  const editFields: EditField[] = editTarget ? [
    { key: 'fullName', label: t('users.fullName'), value: editTarget.fullName },
    { key: 'email', label: t('users.email'), value: editTarget.email, type: 'email' },
  ] : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('users.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('users.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              {t('users.addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('users.addUserTitle')}</DialogTitle>
              <DialogDescription>{t('users.addUserDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('users.fullName')}</Label>
                <Input id="fullName" placeholder="Nguyễn Văn A" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('users.email')}</Label>
                <Input id="email" type="email" placeholder="email@edu.vn" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('users.role')}</Label>
                <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{t('role.student')}</SelectItem>
                    <SelectItem value="teacher">{t('role.teacher')}</SelectItem>
                    <SelectItem value="admin">{t('role.admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t('action.cancel')}</Button>
              <Button onClick={handleAddUser}>{t('users.addUser')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 stagger-children">
        <StatCard title={t('users.totalUsers')} value={stats.total} icon={Users} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard title={t('role.admin')} value={stats.admins} icon={Shield} iconColor="text-destructive" iconBg="bg-destructive/10" />
        <StatCard title={t('role.teacher')} value={stats.teachers} icon={BookOpen} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard title={t('role.student')} value={stats.students} icon={GraduationCap} iconColor="text-accent" iconBg="bg-accent/10" />
        <StatCard title={t('users.activeUsers')} value={stats.active} icon={CheckCircle2} iconColor="text-accent" iconBg="bg-accent/10" className="col-span-2 sm:col-span-1" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('users.searchUsers')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t('users.role')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('users.allRoles')}</SelectItem>
              <SelectItem value="admin">{t('role.admin')}</SelectItem>
              <SelectItem value="teacher">{t('role.teacher')}</SelectItem>
              <SelectItem value="student">{t('role.student')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t('users.statusLabel')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('users.allStatus')}</SelectItem>
              <SelectItem value="active">{t('users.activeStatus')}</SelectItem>
              <SelectItem value="inactive">{t('users.inactiveStatus')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>{t('users.user')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('users.email')}</TableHead>
                  <TableHead>{t('users.role')}</TableHead>
                  <TableHead>{t('users.statusLabel')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('users.createdAt')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const role = roleConfig[user.role];
                  const RoleIcon = role.icon;
                  return (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{user.fullName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-sm">{user.fullName}</span>
                            <p className="text-xs text-muted-foreground sm:hidden">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 text-[10px] h-5 ${role.className}`}>
                          <RoleIcon className="h-3 w-3" />
                          {role.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleToggleStatus(user.id)} className="cursor-pointer">
                          {user.isActive ? (
                            <Badge variant="outline" className="gap-1 text-[10px] h-5 bg-accent/10 text-accent border-accent/20 hover:bg-accent/20 transition-colors">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('users.active')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-[10px] h-5 bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                              <XCircle className="h-3 w-3" />
                              {t('users.inactive')}
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {new Date(user.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditTarget(user)}>
                              <Edit className="mr-2 h-4 w-4" />{t('action.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRoleChangeTarget(user)}>
                              <Shield className="mr-2 h-4 w-4" />{t('action.changeRole')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(user)}>
                              <Trash2 className="mr-2 h-4 w-4" />{t('action.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredUsers.length} / {users.length} {t('users.user').toLowerCase()}</span>
          </div>
        </Card>
      ) : (
        <EmptyState icon={Users} title={t('users.notFound')} description={t('users.notFoundDesc')} />
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('confirm.deleteUser')}
        description={`${t('confirm.sure')} "${deleteTarget?.fullName}"? ${t('confirm.irreversible')}`}
        onConfirm={handleDelete}
      />

      <EditDialog
        open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}
        title={`${t('action.edit')} ${t('users.user').toLowerCase()}`}
        description={t('toast.updated')} fields={editFields} onSave={handleEditSave}
      />

      {/* Role Change Dialog */}
      <Dialog open={!!roleChangeTarget} onOpenChange={(open) => !open && setRoleChangeTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('users.changeRoleTitle')}</DialogTitle>
            <DialogDescription>{t('users.changeRoleDesc')} {roleChangeTarget?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {(['student', 'teacher', 'admin'] as UserRole[]).map((r) => {
              const config = roleConfig[r];
              const RIcon = config.icon;
              const isSelected = roleChangeTarget?.role === r;
              return (
                <button key={r} onClick={() => roleChangeTarget && handleRoleChange(roleChangeTarget.id, r)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:bg-muted/50'}`}
                >
                  <div className={`h-9 w-9 rounded-lg ${config.className} flex items-center justify-center`}>
                    <RIcon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{config.label}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
