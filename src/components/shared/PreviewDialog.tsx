import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, FileType, File } from 'lucide-react';

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  fileType: string;
  fileSize: string;
  content?: string;
}

export default function PreviewDialog({
  open,
  onOpenChange,
  filename,
  fileType,
  fileSize,
  content,
}: PreviewDialogProps) {
  const getIcon = () => {
    switch (fileType) {
      case 'pdf': return <FileText className="h-6 w-6 text-destructive" />;
      case 'docx': return <FileType className="h-6 w-6 text-primary" />;
      default: return <File className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <DialogTitle className="text-base">{filename}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">{fileType.toUpperCase()}</Badge>
                <span className="text-xs text-muted-foreground">{fileSize}</span>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="border rounded-lg p-6 bg-muted/30 min-h-[300px] overflow-auto">
          {content ? (
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm">
              {content}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              {getIcon()}
              <p className="mt-4 font-medium">Xem trước tài liệu</p>
              <p className="text-sm mt-1">Nội dung mẫu của {filename}</p>
              <div className="mt-6 text-left text-sm space-y-3 max-w-md">
                <p><strong>Chương 1: Giới thiệu</strong></p>
                <p>Đây là nội dung minh họa cho tài liệu. Trong phiên bản thực tế, nội dung thực của tài liệu sẽ được hiển thị ở đây.</p>
                <p><strong>1.1 Tổng quan</strong></p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                <p><strong>1.2 Mục tiêu</strong></p>
                <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
