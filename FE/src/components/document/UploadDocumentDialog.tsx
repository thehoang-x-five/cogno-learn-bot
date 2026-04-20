import { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, FileSpreadsheet, Presentation, FileCode, Image, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { documentService } from '@/services/documentService';
import { getApiErrorDetail } from '@/services/apiClient';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  onUploadSuccess: () => void;
}

interface UploadingFile {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export default function UploadDocumentDialog({
  open,
  onOpenChange,
  courseId,
  onUploadSuccess,
}: UploadDocumentDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    // New file types
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'text/markdown',
    'text/html',
    'application/rtf',
    'application/vnd.oasis.opendocument.text', // ODT
    'text/csv',
    'application/json',
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
    'image/bmp'
  ];
  
  const ALLOWED_EXTENSIONS = [
    // Original
    '.pdf', '.docx', '.txt',
    // Priority 1
    '.pptx', '.xlsx', '.md', '.html',
    // Priority 2
    '.rtf', '.odt', '.csv', '.json',
    // Images
    '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp'
  ];
  
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return 'Chỉ chấp nhận file: PDF, DOCX, TXT, PPTX, XLSX, MD, HTML, RTF, ODT, CSV, JSON, và ảnh (JPG, PNG, WEBP, TIFF, BMP)';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File quá lớn. Tối đa ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    return null;
  };

  const handleFilesSelect = (files: FileList | File[]) => {
    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        // Check if file already selected
        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
          newFiles.push(file);
        }
      }
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) return;

    // Initialize uploading files
    const initialUploading: UploadingFile[] = selectedFiles.map(file => ({
      file,
      status: 'uploading',
      progress: 0
    }));
    setUploadingFiles(initialUploading);
    setSelectedFiles([]);

    // Upload files sequentially
    for (let i = 0; i < initialUploading.length; i++) {
      const uploadFile = initialUploading[i];
      
      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => {
            const updated = [...prev];
            if (updated[i] && updated[i].progress < 90) {
              updated[i].progress += 10;
            }
            return updated;
          });
        }, 200);

        await documentService.upload(courseId, uploadFile.file);

        clearInterval(progressInterval);

        // Update to success
        setUploadingFiles(prev => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            status: 'success',
            progress: 100
          };
          return updated;
        });

      } catch (error: unknown) {
        // Update to error
        setUploadingFiles(prev => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            status: 'error',
            progress: 0,
            error: getApiErrorDetail(error, 'Lỗi upload')
          };
          return updated;
        });
      }
    }

    // Notify parent and auto-close after all uploads complete
    onUploadSuccess();
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    const isUploading = uploadingFiles.some(f => f.status === 'uploading');
    if (!isUploading) {
      setSelectedFiles([]);
      setUploadingFiles([]);
      onOpenChange(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    // Spreadsheets
    if (ext === 'xlsx' || ext === 'csv') {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    }
    
    // Presentations
    if (ext === 'pptx') {
      return <Presentation className="h-8 w-8 text-orange-600" />;
    }
    
    // Code/Markup
    if (ext === 'md' || ext === 'html' || ext === 'json') {
      return <FileCode className="h-8 w-8 text-purple-600" />;
    }
    
    // Images
    if (['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp'].includes(ext || '')) {
      return <Image className="h-8 w-8 text-pink-600" />;
    }
    
    // Documents (PDF, DOCX, TXT, RTF, ODT)
    return <FileText className="h-8 w-8 text-blue-600" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload tài liệu</DialogTitle>
          <DialogDescription>
            Chọn file PDF, DOCX, TXT, PPTX, XLSX, Markdown, HTML, RTF, ODT, CSV, JSON hoặc ảnh. Tối đa 50MB/file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              Kéo thả file vào đây hoặc
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Chọn file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.pptx,.xlsx,.md,.html,.rtf,.odt,.csv,.json,.jpg,.jpeg,.png,.webp,.tiff,.bmp"
              multiple
              onChange={handleFileInputChange}
            />
            <p className="text-xs text-gray-500 mt-4">
              PDF, DOCX, TXT, PPTX, XLSX, MD, HTML, RTF, ODT, CSV, JSON, Images • Tối đa 50MB/file • Có thể chọn nhiều file
            </p>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Đã chọn {selectedFiles.length} file
              </p>
              {selectedFiles.map((file, index) => (
                <div key={index} className="border rounded-lg p-3 flex items-center gap-3">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Uploading Files */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {uploadingFiles.filter(f => f.status === 'uploading').length > 0 && 
                  `Đang upload ${uploadingFiles.filter(f => f.status === 'uploading').length} file`}
                {uploadingFiles.filter(f => f.status === 'success').length > 0 && 
                  ` • Hoàn thành ${uploadingFiles.filter(f => f.status === 'success').length} file`}
              </p>
              {uploadingFiles.map((uploadFile, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start gap-3 mb-2">
                    {getFileIcon(uploadFile.file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{uploadFile.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                    </div>
                    {uploadFile.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                  </div>

                  {uploadFile.status === 'uploading' && (
                    <div className="space-y-1">
                      <Progress value={uploadFile.progress} />
                      <p className="text-xs text-gray-600">
                        Đang upload... {uploadFile.progress}%
                      </p>
                    </div>
                  )}

                  {uploadFile.status === 'success' && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Upload thành công! Tài liệu đang được xử lý...
                    </p>
                  )}

                  {uploadFile.status === 'error' && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {uploadFile.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploadingFiles.some(f => f.status === 'uploading')}
            >
              {uploadingFiles.length > 0 ? 'Đóng' : 'Hủy'}
            </Button>
            <Button
              onClick={handleUploadAll}
              disabled={selectedFiles.length === 0 || uploadingFiles.some(f => f.status === 'uploading')}
            >
              Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
