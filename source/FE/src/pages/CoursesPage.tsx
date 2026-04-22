import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Course } from '@/types/course';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Search, Plus, Users, FileText, MoreVertical, MessageSquare, Grid3X3, List, Edit, Trash2, Copy, Share2, Upload, FileSpreadsheet, CheckCircle2, XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CreateCourseWithEnrollmentsDialog } from '@/components/course/CreateCourseWithEnrollmentsDialog';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import ErrorDialog from '@/components/shared/ErrorDialog';
import EditDialog, { EditField } from '@/components/shared/EditDialog';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import { useCourses } from '@/hooks/useDataFetching';
import { courseService } from '@/services/courseService';
import { getApiErrorDetail, type ApiError } from '@/services/apiClient';

const courseColors = ['bg-primary/10', 'bg-accent/10', 'bg-warning/10', 'bg-info/10', 'bg-destructive/10', 'bg-secondary'];
const courseTextColors = ['text-primary', 'text-accent', 'text-warning', 'text-info', 'text-destructive', 'text-muted-foreground'];

export default function CoursesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: courses, isLoading, refetch } = useCourses();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [editTarget, setEditTarget] = useState<Course | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  /** `courses` must be an array; guard against stale bundles or odd API shapes */
  const courseList = Array.isArray(courses) ? courses : [];
  const filteredCourses = courseList.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) || course.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'active' && course.is_active) || (filter === 'inactive' && !course.is_active);
    return matchesSearch && matchesFilter;
  });

  const canManageCourses = user?.role === 'admin' || user?.role === 'teacher';
  /** Chỉ admin mới tạo / import khóa học (gọi /api/admin/courses) */
  const canCreateCourse = user?.role === 'admin';
  /** Admin API: PUT/DELETE `/api/admin/courses` — chỉ admin mới sửa/xóa khóa học trên server */
  const canEditOrDeleteCourse = user?.role === 'admin';

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await courseService.delete(deleteTarget.id);
      setDeleteTarget(null);
      await refetch();
      toast({ title: t('toast.deleted'), description: `${t('courses.name')} "${deleteTarget.name}" ${t('toast.deleted').toLowerCase()}.` });
    } catch (err) {
      const e = err as ApiError;
      toast({
        variant: 'destructive',
        title: t('status.error'),
        description: typeof e.detail === 'string' ? e.detail : e.message,
      });
    }
  }, [deleteTarget, refetch, toast, t]);

  const handleEdit = useCallback(async (values: Record<string, string>) => {
    if (!editTarget) return;
    try {
      await courseService.update(editTarget.id, {
        code: values.code,
        name: values.name,
        description: values.description || undefined,
        semester: values.semester || undefined,
      });
      setEditTarget(null);
      await refetch();
      toast({ title: t('toast.updated'), description: `${t('courses.name')} "${values.name}" ${t('toast.updated').toLowerCase()}.` });
    } catch (err) {
      const e = err as ApiError;
      toast({
        variant: 'destructive',
        title: t('status.error'),
        description: typeof e.detail === 'string' ? e.detail : e.message,
      });
      throw err;
    }
  }, [editTarget, refetch, toast, t]);

  const handleShare = useCallback((course: Course) => {
    const url = `${window.location.origin}/courses/${course.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: t('toast.linkCopied'), description: `Link ${course.name} ${t('toast.copied').toLowerCase()}.` });
  }, [toast, t]);

  const handleImportExcel = async () => {
    if (!importFile) {
      toast({ title: 'Thiếu file', description: 'Vui lòng chọn file Excel', variant: 'destructive' });
      return;
    }

    try {
      setIsImporting(true);
      const result = await courseService.importFromExcel(importFile);
      
      if (result.failed > 0 && result.errors.length > 0) {
        // Show error dialog with details
        setImportErrors(result.errors);
        setShowErrorDialog(true);
        toast({
          title: 'Import hoàn tất với lỗi',
          description: `Thành công: ${result.success}, Thất bại: ${result.failed}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Thành công',
          description: `Đã import ${result.success} khóa học`,
        });
      }
      
      setIsImportDialogOpen(false);
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      refetch();
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: getApiErrorDetail(error, 'Không thể import file Excel'),
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: 'File không hợp lệ',
          description: 'Vui lòng chọn file Excel (.xlsx hoặc .xls)',
          variant: 'destructive',
        });
        return;
      }
      setImportFile(file);
    }
  };

  const editFields: EditField[] = editTarget ? [
    { key: 'code', label: t('courses.code'), value: editTarget.code, placeholder: 'VD: CS101' },
    { key: 'name', label: t('courses.name'), value: editTarget.name, placeholder: t('courses.name') },
    { key: 'description', label: t('courses.description'), value: editTarget.description || '', type: 'textarea', placeholder: t('courses.description') },
    { key: 'semester', label: t('courses.semester'), value: editTarget.semester, placeholder: 'VD: HK1-2025' },
  ] : [];

  const renderCourseActions = (course: Course) => (
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course.id}`); }}>
        <BookOpen className="mr-2 h-4 w-4" />{t('action.viewDetail')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate('/chat'); }}>
        <MessageSquare className="mr-2 h-4 w-4" />{t('courses.chatAbout')}
      </DropdownMenuItem>
      {canManageCourses && (
        <>
          <DropdownMenuSeparator />
          {canEditOrDeleteCourse && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditTarget(course); }}>
              <Edit className="mr-2 h-4 w-4" />{t('action.edit')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(course.code); toast({ title: t('toast.codeCopied'), description: `${course.code} ${t('toast.copied').toLowerCase()}.` }); }}>
            <Copy className="mr-2 h-4 w-4" />{t('action.copyCode')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShare(course); }}>
            <Share2 className="mr-2 h-4 w-4" />{t('action.share')}
          </DropdownMenuItem>
          {canEditOrDeleteCourse && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(course); }}>
                <Trash2 className="mr-2 h-4 w-4" />{t('action.delete')}
              </DropdownMenuItem>
            </>
          )}
        </>
      )}
    </DropdownMenuContent>
  );

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-64 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-32 rounded bg-muted animate-pulse" />
        </div>
        <LoadingState variant="cards" count={6} className="lg:grid-cols-3" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('courses.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {user?.role === 'admin' ? t('courses.admin.subtitle') : user?.role === 'teacher' ? t('courses.teacher.subtitle') : t('courses.student.subtitle')}
          </p>
        </div>
        {canCreateCourse && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="h-4 w-4" />
              Import Excel
            </Button>
            <Button variant="gradient" className="gap-2 w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Tạo khóa học
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('courses.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <Button key={f} variant={filter === f ? 'default' : 'ghost'} size="sm" onClick={() => setFilter(f)} className="text-xs h-7">
                {f === 'all' ? t('courses.all') : f === 'active' ? t('courses.active') : t('courses.inactive')}
              </Button>
            ))}
          </div>
          <div className="flex gap-1 bg-secondary rounded-lg p-1 ml-auto">
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('grid')}>
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('list')}>
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {filteredCourses.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children' : 'space-y-3 stagger-children'
        )}>
          {filteredCourses.map((course, index) => (
            <Card key={course.id} className={cn(
              'hover-lift group cursor-pointer transition-all focus-within:ring-2 focus-within:ring-primary/30',
              viewMode === 'list' && 'flex flex-row items-center'
            )} onClick={() => navigate(`/courses/${course.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/courses/${course.id}`)}>
              {viewMode === 'grid' ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-xl ${courseColors[index % 6]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <BookOpen className={`h-6 w-6 ${courseTextColors[index % 6]}`} />
                        </div>
                        <div>
                          <Badge variant={course.is_active ? 'default' : 'secondary'} className="mb-1 text-[10px]">{course.code}</Badge>
                          <CardTitle className="text-base leading-tight">{course.name}</CardTitle>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        {renderCourseActions(course)}
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-2 mb-4 text-xs">{course.description}</CardDescription>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.student_count} sinh viên</div>
                      <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.teacher_count} giảng viên</div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <Badge variant="outline" className="text-[10px]">{course.semester}</Badge>
                      {course.is_active ? (
                        <Badge variant="outline" className="gap-1 text-[10px] bg-accent/10 text-accent border-accent/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Đang mở
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-[10px] bg-muted text-muted-foreground">
                          <XCircle className="h-3 w-3" />
                          Đã đóng
                        </Badge>
                      )}
                      {course.enrollmentRole && (
                        <Badge variant={course.enrollmentRole === 'teacher' ? 'default' : 'secondary'} className="text-[10px]">
                          {course.enrollmentRole === 'teacher' ? t('role.teacher') : t('role.student')}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="flex items-center gap-4 p-4 w-full">
                  <div className={`h-10 w-10 rounded-lg ${courseColors[index % 6]} flex items-center justify-center shrink-0`}>
                    <BookOpen className={`h-5 w-5 ${courseTextColors[index % 6]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{course.code}</Badge>
                      <span className="font-medium text-sm">{course.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{course.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.student_count} SV</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.teacher_count} GV</span>
                    {course.is_active ? (
                      <Badge variant="outline" className="gap-1 text-[10px] bg-accent/10 text-accent border-accent/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Đang mở
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-[10px] bg-muted text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        Đã đóng
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">{course.semester}</Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    {renderCourseActions(course)}
                  </DropdownMenu>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={t('courses.notFound')}
          description={t('courses.notFoundDesc')}
          action={canCreateCourse ? { label: t('courses.create'), onClick: () => setIsCreateOpen(true), icon: Plus } : undefined}
        />
      )}

      <CreateCourseWithEnrollmentsDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onSuccess={() => {
          setIsCreateOpen(false);
          // Reload courses from API
          refetch();
        }} 
      />

      {/* Import Excel Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import khóa học từ Excel</DialogTitle>
            <DialogDescription>
              Tải lên file Excel với các cột: Mã khóa học, Tên khóa học, Học kỳ, Mô tả
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="excel-file">Chọn file Excel</Label>
              <Input
                id="excel-file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
              {importFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{importFile.name}</span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Định dạng file Excel:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Cột 1: code (Mã khóa học - bắt buộc)</li>
                <li>Cột 2: name (Tên khóa học - bắt buộc)</li>
                <li>Cột 3: semester (Học kỳ - tùy chọn)</li>
                <li>Cột 4: description (Mô tả - tùy chọn)</li>
                <li>is_active mặc định là 1 (đang mở)</li>
                <li>Dòng lỗi sẽ được bỏ qua và tiếp tục import các dòng sau</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setImportFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}>
              Hủy
            </Button>
            <Button onClick={handleImportExcel} disabled={!importFile || isImporting}>
              {isImporting ? 'Đang import...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('confirm.deleteCourse')}
        description={`${t('confirm.sure')} "${deleteTarget?.name}"? ${t('confirm.irreversible')}`}
        onConfirm={handleDelete}
      />

      <EditDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title={`${t('action.edit')} ${t('courses.title').toLowerCase()}`}
        description={t('toast.updated')}
        fields={editFields}
        onSave={handleEdit}
      />

      {/* Error Dialog */}
      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        title="Lỗi Import Khóa học"
        description="Một số dòng trong file Excel có lỗi và không thể import."
        errors={importErrors}
        onConfirm={() => {
          setShowErrorDialog(false);
          setImportErrors([]);
        }}
      />
    </div>
  );
}
