import { useEffect, useState } from 'react';
import { CalendarClock, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorDetail } from '@/services/apiClient';
import { quizService } from '@/services/quizService';
import { parseBackendDate } from '@/utils/dateUtils';
import type { ExamSchedule, ExamSchedulePayload, ExamType } from '@/types/quiz';

interface ManageExamScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  courseName: string;
  schedule?: ExamSchedule | null;
  onSuccess: () => void | Promise<void>;
}

const EXAM_TYPE_OPTIONS: Array<{ value: ExamType; label: string }> = [
  { value: 'midterm', label: 'Giữa kỳ' },
  { value: 'final', label: 'Cuối kỳ' },
  { value: 'quiz', label: 'Kiểm tra' },
  { value: 'practical', label: 'Thực hành' },
];

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function toDateTimeLocalValue(value: string | null | undefined): string {
  const date = parseBackendDate(value);
  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-') + `T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function localInputToUtcIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
  ].join('-') + `T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:00`;
}

export default function ManageExamScheduleDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  schedule,
  onSuccess,
}: ManageExamScheduleDialogProps) {
  const [examType, setExamType] = useState<ExamType>('midterm');
  const [examDate, setExamDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = Boolean(schedule);

  useEffect(() => {
    if (!open) return;

    setExamType(schedule?.exam_type ?? 'midterm');
    setExamDate(toDateTimeLocalValue(schedule?.exam_date));
    setDurationMinutes(schedule ? String(schedule.duration_minutes) : '90');
    setLocation(schedule?.location ?? '');
    setNotes(schedule?.notes ?? '');
  }, [open, schedule]);

  const handleClose = () => {
    if (submitting) return;
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!examDate) {
      toast({ title: 'Thiếu thời gian', description: 'Vui lòng chọn ngày giờ thi.', variant: 'destructive' });
      return;
    }

    const parsedDuration = Number(durationMinutes);
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      toast({ title: 'Sai thời lượng', description: 'Thời lượng phải là số phút lớn hơn 0.', variant: 'destructive' });
      return;
    }

    const examDateUtc = localInputToUtcIso(examDate);
    if (!examDateUtc) {
      toast({ title: 'Sai thời gian', description: 'Không thể đọc ngày giờ thi.', variant: 'destructive' });
      return;
    }

    const payload: ExamSchedulePayload = {
      exam_type: examType,
      exam_date: examDateUtc,
      duration_minutes: parsedDuration,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      if (schedule) {
        await quizService.updateExamSchedule(schedule.id, payload);
      } else {
        await quizService.createExamSchedule(courseId, payload);
      }

      await onSuccess();
      toast({
        title: isEditMode ? 'Đã cập nhật lịch thi' : 'Đã thêm lịch thi',
        description: `${courseName} đã được cập nhật lịch thi.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: isEditMode ? 'Lỗi sửa lịch thi' : 'Lỗi thêm lịch thi',
        description: getApiErrorDetail(error, 'Không thể lưu lịch thi.'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-orange-500" />
            {isEditMode ? 'Sửa lịch thi' : 'Thêm lịch thi'}
          </DialogTitle>
          <DialogDescription>
            Môn học: <span className="font-medium text-foreground">{courseName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại lịch thi</Label>
              <Select value={examType} onValueChange={(value) => setExamType(value as ExamType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại lịch thi" />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam-duration">Thời lượng (phút)</Label>
              <Input
                id="exam-duration"
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exam-date">Ngày giờ thi</Label>
            <Input
              id="exam-date"
              type="datetime-local"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exam-location">Địa điểm</Label>
            <Input
              id="exam-location"
              placeholder="VD: Phòng B203"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exam-notes">Ghi chú</Label>
            <Textarea
              id="exam-notes"
              placeholder="Thông tin bổ sung cho ca thi"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditMode ? 'Cập nhật' : 'Lưu lịch thi'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
