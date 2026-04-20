import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, ClipboardList, Clock, Mail, TrendingUp } from 'lucide-react';

interface StudentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    fullName: string;
    email: string;
    avatarUrl: string;
    progress: number;
    quizzesTaken: number;
    lastActive: string;
  } | null;
  totalQuizzes: number;
}

export default function StudentDetailDialog({
  open,
  onOpenChange,
  student,
  totalQuizzes,
}: StudentDetailDialogProps) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chi tiết sinh viên</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={student.avatarUrl} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {student.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{student.fullName}</h3>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Mail className="h-3.5 w-3.5" />
                {student.email}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-primary/5 text-center">
              <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold">{student.progress}%</p>
              <p className="text-xs text-muted-foreground">Tiến độ</p>
            </div>
            <div className="p-4 rounded-xl bg-warning/5 text-center">
              <ClipboardList className="h-5 w-5 text-warning mx-auto mb-1" />
              <p className="text-xl font-bold">{student.quizzesTaken}/{totalQuizzes}</p>
              <p className="text-xs text-muted-foreground">Quiz đã làm</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Tiến độ học tập</span>
              <span className="text-muted-foreground">{student.progress}%</span>
            </div>
            <Progress value={student.progress} className="h-2" />
          </div>

          {/* Last active */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4" />
            <span>Hoạt động cuối: {student.lastActive}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
