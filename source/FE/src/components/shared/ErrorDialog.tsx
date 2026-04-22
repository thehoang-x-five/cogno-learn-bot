import { AlertCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  errors: string[];
  onConfirm?: () => void;
}

export default function ErrorDialog({
  open,
  onOpenChange,
  title,
  description,
  errors,
  onConfirm,
}: ErrorDialogProps) {
  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Phát hiện {errors.length} lỗi trong quá trình import. Vui lòng kiểm tra và sửa các lỗi sau:
            </AlertDescription>
          </Alert>

          <div>
            <p className="text-sm font-medium mb-2">Chi tiết lỗi:</p>
            <ScrollArea className="h-64 rounded border bg-muted/30 p-3">
              <ul className="space-y-2">
                {errors.map((err, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Lưu ý:</strong> Các dòng không có lỗi đã được import thành công. 
              Bạn có thể sửa file Excel và import lại các dòng bị lỗi.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full sm:w-auto">
            OK, Tôi đã hiểu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
