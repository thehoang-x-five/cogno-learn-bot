import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ErrorDialog from '@/components/shared/ErrorDialog';
import { getApiErrorDetail } from '@/services/apiClient';
import { courseService, type ImportResult } from '@/services/courseService';

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  courseName: string;
  onImportSuccess: () => void;
}

export default function ImportStudentsDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  onImportSuccess,
}: ImportStudentsDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (isImporting) return;
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    try {
      const res = await courseService.importStudents(courseId, selectedFile);
      setImportResult(res);
      
      if (res.success > 0) {
        onImportSuccess();
      }
      
      // Show error dialog if there are errors
      if (res.failed > 0 && res.errors.length > 0) {
        setShowErrorDialog(true);
      } else if (res.failed === 0) {
        // Success without errors - close dialog
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (error) {
      alert(getApiErrorDetail(error, 'Không thể import người dùng vào lớp'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'email\nsv001@student.edu.vn\nsv002@student.edu.vn\nteacher01@school.edu.vn\n';
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_course_users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import người dùng vào lớp</DialogTitle>
            <DialogDescription>
              Môn học: <span className="font-medium text-foreground">{courseName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File input */}
            <div className="space-y-2">
              <Label htmlFor="excel-file">Chọn file Excel/CSV</Label>
              <Input
                id="excel-file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                </div>
              )}
            </div>

            {/* Format guide */}
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Định dạng file import:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Cột: email (bắt buộc)</li>
                <li>Email phải tồn tại trong hệ thống</li>
                <li>Hệ thống tự động kiểm tra role (student/teacher)</li>
                <li>Người dùng đã trong lớp sẽ bị bỏ qua</li>
                <li>Dòng lỗi sẽ được bỏ qua và tiếp tục import các dòng sau</li>
              </ul>
            </div>

            {/* Download template */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Tải file mẫu
            </Button>

            {/* Import result */}
            {importResult && (
              <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResult.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              {importResult && importResult.failed === 0 ? 'Đóng' : 'Hủy'}
            </Button>
            <Button onClick={handleImport} disabled={!selectedFile || isImporting}>
              {isImporting ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" />
                  Đang import...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      {importResult && (
        <ErrorDialog
          open={showErrorDialog}
          onOpenChange={setShowErrorDialog}
          title="Lỗi Import Người dùng vào Lớp"
          description={`Một số dòng trong file Excel có lỗi. Đã import thành công ${importResult.success} người, thất bại ${importResult.failed} người.`}
          errors={importResult.errors}
          onConfirm={() => {
            setShowErrorDialog(false);
            handleClose();
          }}
        />
      )}
    </>
  );
}
