import { useState, useEffect } from 'react';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminService } from '@/services/adminService';
import { courseService } from '@/services/courseService';
import { getApiErrorDetail } from '@/services/apiClient';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: 'student' | 'teacher' | 'admin';
  is_active: boolean;
  created_at: string;
}

interface AddUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  courseName: string;
  role: 'teacher' | 'student';
  onSuccess: () => void;
}

export default function AddUsersDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  role,
  onSuccess,
}: AddUsersDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
      setSelectedUserIds(new Set());
      setSearch('');
    }
  }, [open, role]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getUsers({
        role,
        is_active: true,
        limit: 1000,
      });
      console.log('[AddUsersDialog] Loaded users:', response);
      setUsers(response.items);
    } catch (error) {
      console.error('[AddUsersDialog] Error loading users:', error);
      alert('Lỗi tải danh sách người dùng: ' + (error as any)?.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const toggleUser = (userId: number) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const handleSubmit = async () => {
    if (selectedUserIds.size === 0) return;

    setSubmitting(true);
    try {
      const enrollmentRole = role === 'teacher' ? 'teacher' : 'student';
      
      // Add each user to course
      const promises = Array.from(selectedUserIds).map(userId =>
        courseService.addEnrollment({
          user_id: userId,
          course_id: courseId,
          role: enrollmentRole,
        })
      );

      await Promise.all(promises);
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      alert(getApiErrorDetail(error, 'Lỗi thêm người dùng'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Thêm {role === 'teacher' ? 'giáo viên' : 'sinh viên'}
          </DialogTitle>
          <DialogDescription>
            Môn học: <span className="font-medium text-foreground">{courseName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo email hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-96 border rounded-lg">
              <div className="p-4 space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Không tìm thấy {role === 'teacher' ? 'giáo viên' : 'sinh viên'}
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-secondary rounded-lg cursor-pointer transition-colors"
                      onClick={() => toggleUser(user.id)}
                    >
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {user.full_name?.[0] || user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {/* Selected count */}
          {selectedUserIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              Đã chọn {selectedUserIds.size} người
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedUserIds.size === 0 || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang thêm...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Thêm ({selectedUserIds.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
