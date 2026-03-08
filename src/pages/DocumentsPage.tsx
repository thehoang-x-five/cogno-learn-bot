import { useState, useRef, useCallback } from 'react';
import type { Document, DocumentStatus, FileType as DocFileType } from '@/types/document';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText, Upload, Search, MoreVertical, Download, Trash2, Eye,
  CheckCircle2, Clock, AlertCircle, Loader2, File, FileType, Database,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import PreviewDialog from '@/components/shared/PreviewDialog';
import { useDocuments } from '@/hooks/useDataFetching';
import { COURSE_OPTIONS } from '@/constants/courses';

const courses = [{ id: 'all', name: 'Tất cả môn học' }, ...COURSE_OPTIONS.map(c => ({ id: c.id, name: `${c.code} - ${c.name}` }))];

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
  const { t, language } = useLanguage();
  const { data: documents, isLoading, setData: setDocuments } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Document | null>(null);

  const statusConfig: Record<DocumentStatus, { label: string; icon: React.ElementType; className: string }> = {
    ready: { label: t('docs.statusReady'), icon: CheckCircle2, className: 'status-ready' },
    processing: { label: t('docs.statusProcessing'), icon: Loader2, className: 'status-processing' },
    pending: { label: t('docs.statusPending'), icon: Clock, className: 'status-pending' },
    error: { label: t('docs.statusError'), icon: AlertCircle, className: 'status-error' },
  };

  const allDocs = documents || [];
  const filteredDocuments = allDocs.filter((doc) => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || doc.courseId === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const stats = {
    total: allDocs.length,
    ready: allDocs.filter((d) => d.status === 'ready').length,
    processing: allDocs.filter((d) => d.status === 'processing').length,
    totalChunks: allDocs.reduce((sum, d) => sum + d.totalChunks, 0),
  };

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    setDocuments((prev) => prev ? prev.filter((d) => d.id !== deleteTarget.id) : prev);
    toast({ title: t('toast.deleted'), description: `"${deleteTarget.filename}" ${t('toast.deleted').toLowerCase()}.` });
    setDeleteTarget(null);
  }, [deleteTarget, setDocuments, toast, t]);

  const handleDownload = (doc: Document) => {
    toast({ title: t('toast.downloading'), description: `${doc.filename} (${formatFileSize(doc.fileSize)})...` });
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowedExts = ['.pdf', '.docx', '.txt'];

    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExts.includes(ext)) {
        toast({ title: t('docs.unsupportedFormat'), description: `"${file.name}" ${t('docs.notSupported')}.`, variant: 'destructive' });
        return;
      }

      const tempId = Date.now().toString() + Math.random().toString(36).slice(2);
      const rawExt = ext.replace('.', '');
      const fileType: DocFileType = (['pdf', 'docx', 'txt'].includes(rawExt) ? rawExt : 'txt') as DocFileType;

      const newDoc: Document = {
        id: tempId, courseId: selectedCourse === 'all' ? '3' : selectedCourse, uploadedBy: '2',
        filename: file.name, filePath: `/docs/${tempId}`, fileType, fileSize: file.size,
        status: 'processing', totalChunks: 0, createdAt: new Date().toISOString(),
      };
      setDocuments(prev => prev ? [newDoc, ...prev] : [newDoc]);
      toast({ title: t('toast.uploading'), description: `"${file.name}" ${t('toast.beingProcessed')}...` });

      setTimeout(() => {
        setDocuments(prev => prev ? prev.map(d =>
          d.id === tempId ? { ...d, status: 'ready' as DocumentStatus, totalChunks: Math.floor(Math.random() * 60 + 20) } : d
        ) : prev);
        toast({ title: t('toast.processDone'), description: `"${file.name}" ${t('toast.readyToUse')}.` });
      }, 3000 + Math.random() * 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <LoadingState variant="cards" count={4} />
        <LoadingState variant="table" count={4} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('docs.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('docs.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 stagger-children">
        <StatCard title={t('docs.total')} value={stats.total} icon={FileText} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard title={t('docs.processed')} value={stats.ready} icon={CheckCircle2} iconColor="text-accent" iconBg="bg-accent/10" />
        <StatCard title={t('docs.processing')} value={stats.processing} icon={Loader2} iconColor="text-warning" iconBg="bg-warning/10" />
        <StatCard title={t('docs.totalChunks')} value={stats.totalChunks} icon={Database} iconColor="text-info" iconBg="bg-info/10" />
      </div>

      <Card
        className={`border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-primary bg-primary/5 scale-[1.005]' : 'border-border/60 hover:border-primary/30'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10">
          <div className={`h-14 w-14 rounded-2xl ${isDragging ? 'bg-primary/20 scale-110' : 'bg-primary/10'} flex items-center justify-center mb-4 transition-all`}>
            <Upload className={`h-7 w-7 text-primary ${isDragging ? 'animate-bounce' : ''}`} />
          </div>
          <h3 className="text-base font-semibold mb-1">{t('docs.upload')}</h3>
          <p className="text-muted-foreground text-sm mb-4 text-center">{t('docs.uploadDesc')}</p>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" multiple className="hidden" onChange={(e) => { processFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {t('docs.chooseFile')}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('docs.searchDocs')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder={t('chat.selectCourse')} /></SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>{course.id === 'all' ? t('docs.allCourses') : course.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>{t('docs.filename')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('docs.course')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('docs.size')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('docs.chunks')}</TableHead>
                  <TableHead>{t('docs.status')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('docs.date')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const status = statusConfig[doc.status];
                  const StatusIcon = status.icon;
                  const course = courses.find((c) => c.id === doc.courseId);
                  return (
                    <TableRow key={doc.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.fileType)}
                          <div>
                            <span className="font-medium text-sm">{doc.filename}</span>
                            <p className="text-xs text-muted-foreground sm:hidden">{formatFileSize(doc.fileSize)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-[10px] h-5">{course?.name.split(' - ')[0]}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {doc.status === 'processing' ? (
                          <div className="flex items-center gap-2">
                            <Progress value={45} className="w-16 h-1.5" />
                            <span className="text-xs text-muted-foreground">45%</span>
                          </div>
                        ) : (
                          <span className={`text-sm ${doc.totalChunks > 0 ? 'font-mono' : 'text-muted-foreground'}`}>{doc.totalChunks || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 text-[10px] h-5 ${status.className}`}>
                          <StatusIcon className={`h-3 w-3 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {new Date(doc.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewTarget(doc)}><Eye className="mr-2 h-4 w-4" />{t('action.preview')}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)}><Download className="mr-2 h-4 w-4" />{t('action.download')}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(doc)}><Trash2 className="mr-2 h-4 w-4" />{t('action.delete')}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredDocuments.length} / {allDocs.length} {t('docs.filename').toLowerCase()}</span>
          </div>
        </Card>
      ) : (
        <EmptyState icon={FileText} title={t('docs.notFound')} description={t('docs.notFoundDesc')} action={{ label: t('docs.chooseFile'), onClick: () => fileInputRef.current?.click(), icon: Upload }} />
      )}

      <ConfirmDeleteDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t('confirm.deleteDoc')} description={`${t('confirm.sure')} "${deleteTarget?.filename}"? ${t('confirm.irreversible')}`} onConfirm={handleDelete} />
      <PreviewDialog open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)} filename={previewTarget?.filename || ''} fileType={previewTarget?.fileType || ''} fileSize={previewTarget ? formatFileSize(previewTarget.fileSize) : ''} />
    </div>
  );
}
