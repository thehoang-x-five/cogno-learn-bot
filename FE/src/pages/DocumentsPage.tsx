import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Upload, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { documentService } from '@/services/documentService';
import { getApiErrorDetail } from '@/services/apiClient';
import { courseService } from '@/services/courseService';
import DocumentListItem from '@/components/document/DocumentListItem';
import DocumentDetailDialog from '@/components/document/DocumentDetailDialog';
import UploadDocumentDialog from '@/components/document/UploadDocumentDialog';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Document, DocumentStatus } from '@/types/document';
import type { Course } from '@/types/course';

export default function DocumentsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Upload (allowed only when a course is selected in filter)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [canUploadToSelectedCourse, setCanUploadToSelectedCourse] = useState(false);

  // Dialogs
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const canDeleteRow = (doc: Document) => {
    if (doc.can_delete !== undefined) return doc.can_delete;
    return user?.role === 'admin' || user?.role === 'teacher';
  };

  // Defined before useEffects to avoid const TDZ when used in dependency arrays
  const loadDocuments = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const params: { limit: number; course_id?: number; status?: DocumentStatus } = { limit: 500 };
      
      if (selectedCourse !== 'all') {
        params.course_id = Number(selectedCourse);
      }
      
      if (selectedStatus !== 'all') {
        params.status = selectedStatus as DocumentStatus;
      }

      console.log('[DocumentsPage] Loading documents with params:', params);
      const response = await documentService.list(params);
      console.log('[DocumentsPage] Loaded documents:', response.items.length, 'items');
      setDocuments(response.items);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  }, [selectedCourse, selectedStatus]);

  const loadCourses = async () => {
    try {
      const response = await courseService.listCourses({ limit: 500 });
      if (response.success && response.data) {
        setCourses(response.data.items);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCourses(), loadDocuments()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /** Open detail dialog when navigating from notification link `/documents?doc=<id>` */
  useEffect(() => {
    const raw = searchParams.get('doc');
    if (!raw) return;
    const id = Number(raw);
    if (Number.isNaN(id) || id <= 0) return;
    setSelectedDocumentId(id);
    setDetailDialogOpen(true);
  }, [searchParams]);

  useEffect(() => {
    loadDocuments();
  }, [selectedCourse, selectedStatus]);

  useEffect(() => {
    if (selectedCourse === 'all') {
      setCanUploadToSelectedCourse(false);
      return;
    }
    const cid = Number(selectedCourse);
    let cancelled = false;
    courseService
      .checkUploadPermission(cid)
      .then((r) => {
        if (!cancelled) setCanUploadToSelectedCourse(r.can_upload);
      })
      .catch(() => {
        if (!cancelled) setCanUploadToSelectedCourse(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourse]);

  // Auto-refresh for processing documents
  useEffect(() => {
    const hasProcessing = documents.some(
      d => d.status === 'PROCESSING' || d.status === 'PENDING'
    );

    console.log('[DocumentsPage] Auto-refresh check:', {
      hasProcessing,
      documentsCount: documents.length,
      processingDocs: documents.filter(d => d.status === 'PROCESSING' || d.status === 'PENDING').map(d => ({
        id: d.id,
        filename: d.filename,
        status: d.status
      }))
    });

    if (!hasProcessing) return;

    console.log('[DocumentsPage] Starting auto-refresh interval (3s)');

    // Poll every 3 seconds
    const interval = setInterval(() => {
      console.log('[DocumentsPage] Auto-refresh triggered');
      loadDocuments();
    }, 3000);

    return () => {
      console.log('[DocumentsPage] Stopping auto-refresh interval');
      clearInterval(interval);
    };
  }, [documents, loadDocuments]);

  const handleViewDocument = (document: Document) => {
    setSelectedDocumentId(document.id);
    setDetailDialogOpen(true);
  };

  const handleDeleteClick = (document: Document) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      await documentService.download(document.id, document.filename);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: string }).message)
            : t('docs.downloadError');
      alert(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      await documentService.delete(documentToDelete.id);
      loadDocuments();
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error: unknown) {
      alert(getApiErrorDetail(error, 'Lỗi xóa tài liệu'));
    }
  };

  const handleRefresh = () => {
    loadDocuments(true);
  };

  const handleUploadSuccess = () => {
    loadDocuments();
  };

  const uploadCourseId =
    selectedCourse !== 'all' ? Number(selectedCourse) : null;

  // Group documents by status
  const documentsByStatus = {
    ready: documents.filter(d => d.status === 'READY').length,
    processing: documents.filter(d => d.status === 'PROCESSING').length,
    failed: documents.filter(d => d.status === 'FAILED').length,
    pending: documents.filter(d => d.status === 'PENDING').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('docs.title')}</h1>
          <p className="text-gray-600">{t('docs.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TooltipProvider>
            {uploadCourseId != null && canUploadToSelectedCourse ? (
              <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                {t('docs.upload')}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className="inline-flex"
                  >
                    <Button disabled variant="secondary" className="gap-2">
                      <Upload className="h-4 w-4" />
                      {t('docs.upload')}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {selectedCourse === 'all' ? t('docs.selectCourseForUpload') : t('docs.noUploadPermission')}
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-medium leading-tight sm:text-[13px]">{t('docs.total')}</CardTitle>
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-xl font-bold tabular-nums">{documents.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-medium leading-tight sm:text-[13px]">{t('docs.statusReady')}</CardTitle>
            <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-xl font-bold tabular-nums">{documentsByStatus.ready}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-medium leading-tight sm:text-[13px]">{t('docs.statusPending')}</CardTitle>
            <div className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-xl font-bold tabular-nums">{documentsByStatus.pending}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-medium leading-tight sm:text-[13px]">{t('docs.statusProcessing')}</CardTitle>
            <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500 animate-pulse" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-xl font-bold tabular-nums">{documentsByStatus.processing}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-medium leading-tight sm:text-[13px]">{t('docs.statusError')}</CardTitle>
            <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-xl font-bold tabular-nums">{documentsByStatus.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Bộ lọc
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Môn học</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả môn học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả môn học</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Trạng thái</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="READY">Sẵn sàng</SelectItem>
                  <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
                  <SelectItem value="FAILED">Lỗi</SelectItem>
                  <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách tài liệu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Không có tài liệu</p>
                <p className="text-sm">Thử thay đổi bộ lọc hoặc upload tài liệu mới</p>
              </div>
            ) : (
              documents.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  document={doc}
                  canDelete={canDeleteRow(doc)}
                  onView={handleViewDocument}
                  onDelete={handleDeleteClick}
                  onDownload={handleDownloadDocument}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedDocumentId && (
        <DocumentDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          documentId={selectedDocumentId}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Xóa tài liệu"
        description={`Bạn có chắc muốn xóa tài liệu "${documentToDelete?.filename}"? Hành động này không thể hoàn tác.`}
      />

      {uploadCourseId != null && (
        <UploadDocumentDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          courseId={uploadCourseId}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
