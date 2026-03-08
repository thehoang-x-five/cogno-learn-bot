import { useState, useRef } from 'react';
import { Document, DocumentStatus, FileType as DocFileType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileText, Upload, Search, MoreVertical, Download, Trash2, Eye,
  CheckCircle2, Clock, AlertCircle, Loader2, File, FileType,
  Database,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import PreviewDialog from '@/components/shared/PreviewDialog';

const initialDocuments: Document[] = [
  { id: '1', courseId: '3', uploadedBy: '2', filename: 'slide_chuong1_gioi_thieu_oop.pdf', filePath: '/docs/1', fileType: 'pdf', fileSize: 2048000, status: 'ready', totalChunks: 45, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', courseId: '3', uploadedBy: '2', filename: 'slide_chuong2_tinh_chat_oop.pdf', filePath: '/docs/2', fileType: 'pdf', fileSize: 3145728, status: 'ready', totalChunks: 62, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', courseId: '3', uploadedBy: '2', filename: 'giao_trinh_lap_trinh_oop.docx', filePath: '/docs/3', fileType: 'docx', fileSize: 5242880, status: 'processing', totalChunks: 0, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '4', courseId: '1', uploadedBy: '2', filename: 'python_basics.pdf', filePath: '/docs/4', fileType: 'pdf', fileSize: 1536000, status: 'ready', totalChunks: 38, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: '5', courseId: '2', uploadedBy: '2', filename: 'algorithms_sorting.pdf', filePath: '/docs/5', fileType: 'pdf', fileSize: 2867200, status: 'error', totalChunks: 0, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '6', courseId: '1', uploadedBy: '2', filename: 'exercises_chapter1.txt', filePath: '/docs/6', fileType: 'txt', fileSize: 51200, status: 'pending', totalChunks: 0, createdAt: new Date().toISOString() },
];

const courses = [
  { id: 'all', name: 'Tất cả môn học' },
  { id: '1', name: 'CS101 - Nhập môn lập trình' },
  { id: '2', name: 'CS201 - Cấu trúc dữ liệu' },
  { id: '3', name: 'CS301 - Lập trình OOP' },
];

const statusConfig: Record<DocumentStatus, { label: string; icon: React.ElementType; className: string }> = {
  ready: { label: 'Sẵn sàng', icon: CheckCircle2, className: 'status-ready' },
  processing: { label: 'Đang xử lý', icon: Loader2, className: 'status-processing' },
  pending: { label: 'Chờ xử lý', icon: Clock, className: 'status-pending' },
  error: { label: 'Lỗi', icon: AlertCircle, className: 'status-error' },
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'pdf': return <FileText className="h-5 w-5 text-destructive" />;
    case 'docx': return <FileType className="h-5 w-5 text-primary" />;
    default: return <File className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Document | null>(null);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || doc.courseId === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const stats = {
    total: documents.length,
    ready: documents.filter((d) => d.status === 'ready').length,
    processing: documents.filter((d) => d.status === 'processing').length,
    totalChunks: documents.reduce((sum, d) => sum + d.totalChunks, 0),
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    toast({ title: 'Đã xóa', description: `Tài liệu "${deleteTarget.filename}" đã được xóa.` });
    setDeleteTarget(null);
  };

  const handleDownload = (doc: Document) => {
    toast({ title: 'Đang tải xuống', description: `${doc.filename} (${formatFileSize(doc.fileSize)}) đang được tải xuống...` });
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedExts = ['.pdf', '.docx', '.txt'];

    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
        toast({ title: 'Định dạng không hỗ trợ', description: `"${file.name}" không phải PDF, DOCX hoặc TXT.`, variant: 'destructive' });
        return;
      }

      const tempId = Date.now().toString() + Math.random().toString(36).slice(2);
      const fileType = ext.replace('.', '') as string;

      // Add as processing
      const newDoc: Document = {
        id: tempId,
        courseId: selectedCourse === 'all' ? '3' : selectedCourse,
        uploadedBy: '2',
        filename: file.name,
        filePath: `/docs/${tempId}`,
        fileType,
        fileSize: file.size,
        status: 'processing',
        totalChunks: 0,
        createdAt: new Date().toISOString(),
      };
      setDocuments(prev => [newDoc, ...prev]);
      setUploadingFiles(prev => [...prev, tempId]);

      toast({ title: 'Đang tải lên', description: `"${file.name}" đang được tải lên và xử lý...` });

      // Simulate processing
      setTimeout(() => {
        setDocuments(prev => prev.map(d =>
          d.id === tempId ? { ...d, status: 'ready' as DocumentStatus, totalChunks: Math.floor(Math.random() * 60 + 20) } : d
        ));
        setUploadingFiles(prev => prev.filter(id => id !== tempId));
        toast({ title: 'Đã xử lý xong', description: `"${file.name}" đã sẵn sàng sử dụng.` });
      }, 3000 + Math.random() * 2000);
    });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tài liệu</h1>
          <p className="text-muted-foreground mt-1">Quản lý tài liệu môn học cho hệ thống RAG</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 stagger-children">
        {[
          { label: 'Tổng tài liệu', value: stats.total, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Đã xử lý', value: stats.ready, icon: CheckCircle2, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Đang xử lý', value: stats.processing, icon: Loader2, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Tổng chunks', value: stats.totalChunks, icon: Database, color: 'text-info', bg: 'bg-info/10' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-md ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                {stat.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-all duration-300 ${
          isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/30'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className={`h-14 w-14 rounded-2xl ${isDragging ? 'bg-primary/20 scale-110' : 'bg-primary/10'} flex items-center justify-center mb-4 transition-all`}>
            <Upload className={`h-7 w-7 ${isDragging ? 'text-primary animate-bounce' : 'text-primary'}`} />
          </div>
          <h3 className="text-base font-semibold mb-1">Tải lên tài liệu</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Kéo thả file hoặc click để chọn • PDF, DOCX, TXT
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Chọn file
          </Button>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm tài liệu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Chọn môn học" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên file</TableHead>
              <TableHead>Môn học</TableHead>
              <TableHead>Kích thước</TableHead>
              <TableHead>Chunks</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tải</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.map((doc) => {
              const status = statusConfig[doc.status];
              const StatusIcon = status.icon;
              const course = courses.find((c) => c.id === doc.courseId);

              return (
                <TableRow key={doc.id} className="hover:bg-secondary/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.fileType)}
                      <span className="font-medium text-sm">{doc.filename}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{course?.name.split(' - ')[0]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatFileSize(doc.fileSize)}</TableCell>
                  <TableCell>
                    {doc.status === 'processing' ? (
                      <div className="flex items-center gap-2">
                        <Progress value={45} className="w-16 h-1.5" />
                        <span className="text-xs text-muted-foreground">45%</span>
                      </div>
                    ) : (
                      <span className={`text-sm ${doc.totalChunks > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {doc.totalChunks || '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 text-[10px] ${status.className}`}>
                      <StatusIcon className={`h-3 w-3 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewTarget(doc)}>
                          <Eye className="mr-2 h-4 w-4" />Xem trước
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="mr-2 h-4 w-4" />Tải xuống
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(doc)}>
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

      {filteredDocuments.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium">Không tìm thấy tài liệu</h3>
          <p className="text-muted-foreground text-sm mt-1">Thử tìm kiếm với từ khóa khác hoặc chọn môn học khác</p>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa tài liệu"
        description={`Bạn có chắc chắn muốn xóa "${deleteTarget?.filename}"? Tài liệu và tất cả chunks đã xử lý sẽ bị xóa vĩnh viễn.`}
        onConfirm={handleDelete}
      />

      <PreviewDialog
        open={!!previewTarget}
        onOpenChange={(open) => !open && setPreviewTarget(null)}
        filename={previewTarget?.filename || ''}
        fileType={previewTarget?.fileType || ''}
        fileSize={previewTarget ? formatFileSize(previewTarget.fileSize) : ''}
      />
    </div>
  );
}
