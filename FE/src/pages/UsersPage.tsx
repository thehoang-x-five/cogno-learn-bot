import { useState, useCallback, useEffect, useRef } from 'react';
import { parseBackendDate } from '@/utils/dateUtils';
import type { UserRole } from '@/types/user';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, UserPlus, Search, MoreVertical, Edit, Trash2, Shield, GraduationCap, BookOpen, CheckCircle2, XCircle, Upload, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import ErrorDialog from '@/components/shared/ErrorDialog';
import { userService } from '@/services/userService';
import { getApiErrorDetail } from '@/services/apiClient';
import type { User } from '@/types/course';

export default function UsersPage() {
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', role: 'student' as 'admin' | 'teacher' | 'student' });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const roleConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    admin: { label: t('role.admin'), icon: Shield, className: 'bg-destructive/10 text-destructive border-destructive/20' },
    teacher: { label: t('role.teacher'), icon: BookOpen, className: 'bg-primary/10 text-primary border-primary/20' },
    student: { label: t('role.student'), icon: GraduationCap, className: 'bg-accent/10 text-accent border-accent/20' },
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await userService.list({ limit: 500 });
      setUsers(response.items);
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: getApiErrorDetail(error, 'Không thể tải danh sách người dùng'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && user.is_active) || (statusFilter === 'inactive' && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    teachers: users.filter((u) => u.role === 'teacher').length,
    students: users.filter((u) => u.role === 'student').length,
    active: users.filter((u) => u.is_active).length,
  };

  const handleAddUser = async () => {
    if (!newUser.email) {
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập email', variant: 'destructive' });
      return;
    }

    try {
      const userData = {
        email: newUser.email,
        role: newUser.role,
      };
      
      await userService.create(userData);
      toast({ 
        title: 'Thành công', 
        description: `Đã tạo tài khoản cho ${newUser.email}. Người dùng có thể đăng nhập bằng Google.` 
      });
      setIsAddDialogOpen(false);
      setNewUser({ email: '', role: 'student' });
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || error.detail || 'Không thể thêm người dùng',
        variant: 'destructive',
      });
    }
  };

  const handleEditUser = async () => {
    if (!editUser) return;

    try {
      await userService.update(editUser.id, {
        email: editUser.email,
        full_name: editUser.full_name,
        role: editUser.role,
        is_active: editUser.is_active,
      });
      toast({ title: 'Thành công', description: 'Đã cập nhật thông tin người dùng' });
      setIsEditDialogOpen(false);
      setEditUser(null);
      loadUsers();
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: getApiErrorDetail(error, 'Không thể cập nhật người dùng'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await userService.delete(deleteTarget.id);
      toast({ title: 'Thành công', description: `Đã vô hiệu hóa người dùng "${deleteTarget.full_name || deleteTarget.email}"` });
      setDeleteTarget(null);
      loadUsers();
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: getApiErrorDetail(error, 'Không thể vô hiệu hóa người dùng'),
        variant: 'destructive',
      });
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      toast({ title: 'Thiếu file', description: 'Vui lòng chọn file Excel', variant: 'destructive' });
      return;
    }

    try {
      setIsImporting(true);
      const result = await userService.importFromExcel(importFile);
      
      if (result.failed > 0 && result.errors.length > 0) {
        // Show error dialog with details
        setImportErrors(result.errors);
        setShowErrorDialog(true);
        toast({
          title: 'Import hoàn tất với lỗi',
          description: `Thành công: ${result.success}, Thất bại: ${result.failed}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Thành công',
          description: `Đã import ${result.success} người dùng`,
        });
      }
      
      setIsImportDialogOpen(false);
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadUsers();
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: getApiErrorDetail(error, 'Không thể import file Excel'),
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: 'File không hợp lệ',
          description: 'Vui lòng chọn file Excel (.xlsx hoặc .xls)',
          variant: 'destructive',
        });
        return;
      }
      setImportFile(file);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await userService.update(user.id, { is_active: !user.is_active });
      toast({
        title: 'Thành công',
        description: `Đã ${user.is_active ? 'vô hiệu hóa' : 'kích hoạt'} người dùng`,
      });
      loadUsers();
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: getApiErrorDetail(error, 'Không thể cập nhật trạng thái'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <LoadingState variant="cards" count={5} className="lg:grid-cols-5" />
        <LoadingState variant="table" count={5} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('users.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('users.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" className="gap-2 w-full sm:w-auto">
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            {t('users.addUser')}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 stagger-children">
        <StatCard title={t('users.totalUsers')} value={stats.total} icon={Users} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard title={t('role.admin')} value={stats.admins} icon={Shield} iconColor="text-destructive" iconBg="bg-destructive/10" />
        <StatCard title={t('role.teacher')} value={stats.teachers} icon={BookOpen} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard title={t('role.student')} value={stats.students} icon={GraduationCap} iconColor="text-accent" iconBg="bg-accent/10" />
        <StatCard title={t('users.activeUsers')} value={stats.active} icon={CheckCircle2} iconColor="text-accent" iconBg="bg-accent/10" className="col-span-2 sm:col-span-1" />
      </div>

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
                            <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-sm">{user.full_name || user.email}</span>
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
                        <button onClick={() => handleToggleStatus(user)} className="cursor-pointer">
                          {user.is_active ? (
                            <Badge variant="outline" className="gap-1 text-[10px] h-5 bg-accent/10 text-accent border-accent/20 hover:bg-accent/20 transition-colors">
                              <CheckCircle2 className="h-3 w-3" />
                              Hoạt động
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-[10px] h-5 bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                              <XCircle className="h-3 w-3" />
                              Ngừng
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {parseBackendDate(user.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditUser(user); setIsEditDialogOpen(true); }}>
                              <Edit className="mr-2 h-4 w-4" />{t('action.edit')}
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

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.addUserTitle')}</DialogTitle>
            <DialogDescription>
              Tạo tài khoản cho giáo viên/học sinh. Người dùng sẽ đăng nhập bằng Google OAuth và tên sẽ được lấy từ tài khoản Google.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('users.email')} *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@school.edu.vn"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Email phải khớp với tài khoản Google của người dùng
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('users.role')} *</Label>
              <Select value={newUser.role} onValueChange={(value: 'admin' | 'teacher' | 'student') => setNewUser({ ...newUser, role: value })}>
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

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Họ và tên</Label>
                <Input
                  id="edit-fullName"
                  value={editUser.full_name || ''}
                  onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Vai trò</Label>
                <Select value={editUser.role} onValueChange={(value: 'admin' | 'teacher' | 'student') => setEditUser({ ...editUser, role: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Học sinh</SelectItem>
                    <SelectItem value="teacher">Giáo viên</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleEditUser}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Excel Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import người dùng từ Excel</DialogTitle>
            <DialogDescription>
              Tải lên file Excel với 2 cột: email và role (student, teacher, hoặc admin)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="excel-file">Chọn file Excel</Label>
              <Input
                id="excel-file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
              {importFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{importFile.name}</span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Định dạng file Excel:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Cột 1: email (bắt buộc)</li>
                <li>Cột 2: role (bắt buộc: student, teacher, hoặc admin)</li>
                <li>is_active mặc định là 1 (hoạt động)</li>
                <li>Họ tên sẽ được lấy khi người dùng đăng nhập Google</li>
                <li>Dòng lỗi sẽ được bỏ qua và tiếp tục import các dòng sau</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setImportFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}>
              Hủy
            </Button>
            <Button onClick={handleImportExcel} disabled={!importFile || isImporting}>
              {isImporting ? 'Đang import...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Vô hiệu hóa người dùng"
        description={`Bạn có chắc muốn vô hiệu hóa "${deleteTarget?.full_name || deleteTarget?.email}"? Người dùng sẽ không thể đăng nhập nhưng dữ liệu vẫn được giữ lại.`}
        onConfirm={handleDelete}
      />

      {/* Error Dialog */}
      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        title="Lỗi Import Người dùng"
        description="Một số dòng trong file Excel có lỗi và không thể import."
        errors={importErrors}
        onConfirm={() => {
          setShowErrorDialog(false);
          setImportErrors([]);
        }}
      />
    </div>
  );
}
