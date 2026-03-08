import { useState } from 'react';
import { User, UserRole } from '@/types';
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

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; className: string }> = {
  admin: { label: 'Quản trị viên', icon: Shield, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  teacher: { label: 'Giáo viên', icon: BookOpen, className: 'bg-primary/10 text-primary border-primary/20' },
  student: { label: 'Sinh viên', icon: GraduationCap, className: 'bg-accent/10 text-accent border-accent/20' },
};

export default function UsersPage() {
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
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập đầy đủ họ tên và email.', variant: 'destructive' });
      return;
    }
    const user: User = {
      id: Date.now().toString(),
      email: newUser.email,
      fullName: newUser.fullName,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.email}`,
      role: newUser.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, user]);
    setIsAddDialogOpen(false);
    setNewUser({ email: '', fullName: '', role: 'student' });
    toast({ title: 'Đã thêm người dùng', description: `${user.fullName} đã được thêm vào hệ thống.` });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    toast({ title: 'Đã xóa', description: `Người dùng "${deleteTarget.fullName}" đã được xóa.` });
    setDeleteTarget(null);
  };

  const handleEditSave = (values: Record<string, string>) => {
    if (!editTarget) return;
    setUsers((prev) => prev.map((u) =>
      u.id === editTarget.id ? { ...u, fullName: values.fullName, email: values.email } : u
    ));
    toast({ title: 'Đã cập nhật', description: `Thông tin "${values.fullName}" đã được cập nhật.` });
    setEditTarget(null);
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    const user = users.find((u) => u.id === userId);
    toast({ title: 'Đã đổi vai trò', description: `${user?.fullName} đã được chuyển sang ${roleConfig[newRole].label}.` });
    setRoleChangeTarget(null);
  };

  const editFields: EditField[] = editTarget ? [
    { key: 'fullName', label: 'Họ và tên', value: editTarget.fullName },
    { key: 'email', label: 'Email', value: editTarget.email, type: 'email' },
  ] : [];

  return (
    <div className="p-6 lg:p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
          <p className="text-muted-foreground mt-1">Quản lý tài khoản và phân quyền người dùng trong hệ thống</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Thêm người dùng
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm người dùng mới</DialogTitle>
              <DialogDescription>Tạo tài khoản mới cho người dùng. Họ sẽ nhận được email xác nhận.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input id="fullName" placeholder="Nguyễn Văn A" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="email@edu.vn" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Vai trò</Label>
                <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Sinh viên</SelectItem>
                    <SelectItem value="teacher">Giáo viên</SelectItem>
                    <SelectItem value="admin">Quản trị viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleAddUser}>Thêm người dùng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5 stagger-children">
        {[
          { label: 'Tổng người dùng', value: stats.total, icon: Users, color: 'text-muted-foreground', bg: 'bg-muted' },
          { label: 'Quản trị viên', value: stats.admins, icon: Shield, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Giáo viên', value: stats.teachers, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Sinh viên', value: stats.students, icon: GraduationCap, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Đang hoạt động', value: stats.active, icon: CheckCircle2, color: 'text-accent', bg: 'bg-accent/10' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm theo tên, email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Vai trò" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            <SelectItem value="admin">Quản trị viên</SelectItem>
            <SelectItem value="teacher">Giáo viên</SelectItem>
            <SelectItem value="student">Sinh viên</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const role = roleConfig[user.role];
              const RoleIcon = role.icon;
              return (
                <TableRow key={user.id} className="hover:bg-secondary/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">{user.fullName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{user.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 text-[10px] ${role.className}`}>
                      <RoleIcon className="h-3 w-3" />
                      {role.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="outline" className="gap-1 text-[10px] bg-accent/10 text-accent border-accent/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Hoạt động
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-[10px] bg-muted text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        Ngừng
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget(user)}>
                          <Edit className="mr-2 h-4 w-4" />Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRoleChangeTarget(user)}>
                          <Shield className="mr-2 h-4 w-4" />Đổi vai trò
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(user)}>
                          <Trash2 className="mr-2 h-4 w-4" />Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {filteredUsers.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium">Không tìm thấy người dùng</h3>
          <p className="text-muted-foreground text-sm mt-1">Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc</p>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa người dùng"
        description={`Bạn có chắc chắn muốn xóa "${deleteTarget?.fullName}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
      />

      <EditDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="Chỉnh sửa người dùng"
        description="Cập nhật thông tin người dùng"
        fields={editFields}
        onSave={handleEditSave}
      />

      {/* Role Change Dialog */}
      <Dialog open={!!roleChangeTarget} onOpenChange={(open) => !open && setRoleChangeTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Đổi vai trò</DialogTitle>
            <DialogDescription>
              Chọn vai trò mới cho {roleChangeTarget?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {(['student', 'teacher', 'admin'] as UserRole[]).map((r) => {
              const config = roleConfig[r];
              const RIcon = config.icon;
              const isSelected = roleChangeTarget?.role === r;
              return (
                <button
                  key={r}
                  onClick={() => roleChangeTarget && handleRoleChange(roleChangeTarget.id, r)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.className}`}>
                    <RIcon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{config.label}</p>
                  </div>
                  {isSelected && <Badge className="ml-auto text-[10px]">Hiện tại</Badge>}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
