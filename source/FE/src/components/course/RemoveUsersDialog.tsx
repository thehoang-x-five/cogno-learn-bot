import { useState } from 'react';
import { UserMinus, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { courseService } from '@/services/courseService';
import { getApiErrorDetail } from '@/services/apiClient';

interface User {
  id: number;
  email: string;
  full_name?: string | null;
}

interface RemoveUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  courseName: string;
  users: User[];
  role: 'teacher' | 'student';
  enrollments: Array<{ enrollment_id: number; user_id: number; role: string }>;
  onSuccess: () => void;
}

export default function RemoveUsersDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  users,
  role,
  enrollments,
  onSuccess,
}: RemoveUsersDialogProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

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
      // Find enrollment IDs for selected users
      const enrollmentIds = enrollments
        .filter(e => selectedUserIds.has(e.user_id))
        .map(e => e.enrollment_id);

      // Delete each enrollment
      const promises = enrollmentIds.map(enrollmentId =>
        courseService.deleteEnrollment(courseId, enrollmentId)
      );

      await Promise.all(promises);
      onSuccess();
      onOpenChange(false);
      setSelectedUserIds(new Set());
    } catch (error: unknown) {
      alert(getApiErrorDetail(error, 'Lỗi xóa người dùng'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedUserIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Xóa {role === 'teacher' ? 'giáo viên' : 'sinh viên'}
          </DialogTitle>
          <DialogDescription>
            Môn học: <span className="font-medium text-foreground">{courseName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Chọn {role === 'teacher' ? 'giáo viên' : 'sinh viên'} cần xóa khỏi khóa học
            </AlertDescription>
          </Alert>

          {/* User list */}
          <ScrollArea className="h-96 border rounded-lg">
            <div className="p-4 space-y-2">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có {role === 'teacher' ? 'giáo viên' : 'sinh viên'}
                </p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-gray-300"
                  >
                    {/* Custom Checkbox */}
                    <div
                      onClick={() => toggleUser(user.id)}
                      className="flex items-center justify-center w-5 h-5 border-2 border-gray-400 rounded cursor-pointer hover:border-red-500 transition-colors"
                      style={{
                        backgroundColor: selectedUserIds.has(user.id) ? '#ef4444' : 'transparent',
                        borderColor: selectedUserIds.has(user.id) ? '#ef4444' : '#9ca3af'
                      }}
                    >
                      {selectedUserIds.has(user.id) && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-destructive">
                        {user.full_name?.[0] || user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleUser(user.id)}>
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

          {/* Selected count */}
          {selectedUserIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              Đã chọn {selectedUserIds.size} người để xóa
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={selectedUserIds.size === 0 || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xóa...
              </>
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Xóa ({selectedUserIds.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
