import { useState, useEffect, useCallback } from 'react';
import { parseBackendDate } from '@/utils/dateUtils';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Upload, FileText, Users, RefreshCw, UserPlus, ClipboardList, Calendar, Clock, MapPin, ArrowRight, Trophy, BarChart3, UserMinus, FileSpreadsheet, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { courseService } from '@/services/courseService';
import { documentService } from '@/services/documentService';
import { quizService } from '@/services/quizService';
import { getApiErrorDetail } from '@/services/apiClient';
import UploadDocumentDialog from '@/components/document/UploadDocumentDialog';
import ImportStudentsDialog from '@/components/course/ImportStudentsDialog';
import AddUsersDialog from '@/components/course/AddUsersDialog';
import RemoveUsersDialog from '@/components/course/RemoveUsersDialog';
import ManageExamScheduleDialog from '@/components/course/ManageExamScheduleDialog';
import DocumentListItem from '@/components/document/DocumentListItem';
import DocumentDetailDialog from '@/components/document/DocumentDetailDialog';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import type { CourseDetail } from '@/types/course';
import type { Document } from '@/types/document';
import type { CourseQuizStats, ExamSchedule } from '@/types/quiz';

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quizStats, setQuizStats] = useState<CourseQuizStats | null>(null);
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [importStudentsOpen, setImportStudentsOpen] = useState(false);
  const [addTeachersOpen, setAddTeachersOpen] = useState(false);
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [removeTeachersOpen, setRemoveTeachersOpen] = useState(false);
  const [removeStudentsOpen, setRemoveStudentsOpen] = useState(false);
  const [examScheduleDialogOpen, setExamScheduleDialogOpen] = useState(false);
  const [editingExamSchedule, setEditingExamSchedule] = useState<ExamSchedule | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  useEffect(() => {
    if (courseId) {
      loadCourseDetail();
      loadDocuments();
      checkUploadPermission();
      loadQuizStats();
      loadExamSchedules();
    }
  }, [courseId]);

  // Auto-open upload dialog from URL param (?upload=true)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('upload') === 'true') {
      setUploadDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  /** Open document detail from notification link `/courses/:id?doc=<documentId>` */
  useEffect(() => {
    const raw = searchParams.get('doc');
    if (!raw) return;
    const id = Number(raw);
    if (Number.isNaN(id) || id <= 0) return;
    setSelectedDocumentId(id);
    setDetailDialogOpen(true);
  }, [searchParams]);

  // Auto-refresh for processing documents
  useEffect(() => {
    const hasProcessing = documents.some(
      d => d.status === 'PROCESSING' || d.status === 'PENDING'
    );

    console.log('[CourseDetailPage] Auto-refresh check:', {
      hasProcessing,
      documentsCount: documents.length,
      processingDocs: documents.filter(d => d.status === 'PROCESSING' || d.status === 'PENDING').map(d => ({
        id: d.id,
        filename: d.filename,
        status: d.status
      }))
    });

    if (!hasProcessing) return;

    console.log('[CourseDetailPage] Starting auto-refresh interval (3s)');

    // Poll every 3 seconds
    const interval = setInterval(() => {
      console.log('[CourseDetailPage] Auto-refresh triggered');
      loadDocuments();
    }, 3000);

    return () => {
      console.log('[CourseDetailPage] Stopping auto-refresh interval');
      clearInterval(interval);
    };
  }, [documents]);

  const loadCourseDetail = async () => {
    try {
      const data = await courseService.getCourseDetail(Number(courseId));
      setCourse(data);
    } catch (error) {
      console.error('Error loading course:', error);
      alert('Không thể tải thông tin khóa học');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      console.log('[CourseDetailPage] Loading documents for course:', courseId);
      const response = await documentService.list({
        course_id: Number(courseId),
        limit: 100
      });
      console.log('[CourseDetailPage] Loaded documents:', response.items.length, 'items');
      setDocuments(response.items);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  }, [courseId]);

  const checkUploadPermission = async () => {
    try {
      const response = await courseService.checkUploadPermission(Number(courseId));
      setCanUpload(response.can_upload);
    } catch (error) {
      console.error('Error checking permission:', error);
    }
  };

  const loadQuizStats = async () => {
    try {
      const stats = await quizService.getCourseStats(Number(courseId));
      setQuizStats(stats);
    } catch (error) {
      console.error('Error loading quiz stats:', error);
    }
  };

  const loadExamSchedules = async () => {
    try {
      const data = await quizService.getExamSchedules(Number(courseId));
      setExamSchedules(data.items);
    } catch (error) {
      console.error('Error loading exam schedules:', error);
    }
  };

  const examTypeLabels: Record<string, string> = {
    midterm: 'Giữa kỳ',
    final: 'Cuối kỳ',
    quiz: 'Kiểm tra',
    practical: 'Thực hành',
  };

  const examTypeColors: Record<string, string> = {
    midterm: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    final: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    quiz: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    practical: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  };

  const handleUploadSuccess = () => {
    loadDocuments();
    loadCourseDetail(); // Refresh course stats
  };

  const openCreateExamSchedule = () => {
    setEditingExamSchedule(null);
    setExamScheduleDialogOpen(true);
  };

  const openEditExamSchedule = (schedule: ExamSchedule) => {
    setEditingExamSchedule(schedule);
    setExamScheduleDialogOpen(true);
  };

  const handleExamScheduleDialogChange = (open: boolean) => {
    setExamScheduleDialogOpen(open);
    if (!open) {
      setEditingExamSchedule(null);
    }
  };

  const handleDeleteExamSchedule = async (schedule: ExamSchedule) => {
    const scheduleLabel = examTypeLabels[schedule.exam_type] || 'Lịch thi';
    const confirmed = window.confirm(`Xóa ${scheduleLabel.toLowerCase()} của môn ${course?.name}?`);
    if (!confirmed) return;

    try {
      await quizService.deleteExamSchedule(schedule.id);
      await loadExamSchedules();
    } catch (error: unknown) {
      alert(getApiErrorDetail(error, 'Lỗi xóa lịch thi'));
    }
  };

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
    } catch (error: any) {
      alert(error.message || 'Lỗi tải xuống tài liệu');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      await documentService.delete(documentToDelete.id);
      loadDocuments();
      loadCourseDetail();
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error: unknown) {
      alert(getApiErrorDetail(error, 'Lỗi xóa tài liệu'));
    }
  };

  const handleRefresh = () => {
    loadDocuments(true);
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

  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600">Không tìm thấy khóa học</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{course.name}</h1>
            <p className="text-gray-600">
              {course.code} {course.semester && `• ${course.semester}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setImportStudentsOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import Excel
            </Button>
          )}
          {canUpload && (
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload tài liệu
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-700">{course.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats — 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giáo viên</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{course.teacher_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Học sinh</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{course.student_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tài liệu</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{course.document_count}</div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-purple-300 transition-colors"
          onClick={() => navigate(`/quizzes?course_id=${courseId}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz</CardTitle>
            <ClipboardList className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizStats?.total_quizzes ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {quizStats && quizStats.total_attempts > 0
                ? `${quizStats.total_attempts} lượt • TB ${quizStats.average_score_pct}%`
                : 'Xem quiz →'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Teachers, Students & Exam Schedule — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Giáo viên</CardTitle>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAddTeachersOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Thêm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRemoveTeachersOpen(true)}>
                    <UserMinus className="h-4 w-4 mr-1" />
                    Xóa
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {course.teachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có giáo viên</p>
              ) : (
                course.teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center gap-2 p-2 hover:bg-secondary rounded">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {teacher.full_name?.[0] || teacher.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{teacher.full_name || teacher.email}</p>
                      <p className="text-xs text-muted-foreground">{teacher.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Học sinh</CardTitle>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAddStudentsOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Thêm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRemoveStudentsOpen(true)}>
                    <UserMinus className="h-4 w-4 mr-1" />
                    Xóa
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {course.students.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có học sinh</p>
              ) : (
                course.students.map((student) => (
                  <div key={student.id} className="flex items-center gap-2 p-2 hover:bg-secondary rounded">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">
                        {student.full_name?.[0] || student.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.full_name || student.email}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exam Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                Lịch thi
              </CardTitle>
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={openCreateExamSchedule}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm lịch
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {examSchedules.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {examSchedules.map((schedule) => {
                  const examDate = parseBackendDate(schedule.exam_date);
                  const isPast = examDate < new Date();

                  return (
                    <div
                      key={schedule.id}
                      className={`p-3 rounded-lg border transition-colors ${isPast ? 'opacity-50 bg-muted/30' : 'hover:bg-secondary/50'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={examTypeColors[schedule.exam_type] || 'bg-gray-100 text-gray-700'}>
                            {examTypeLabels[schedule.exam_type] || schedule.exam_type}
                          </Badge>
                          {isPast && <Badge variant="outline" className="text-xs">Đã qua</Badge>}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditExamSchedule(schedule)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteExamSchedule(schedule)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">
                            {examDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {examDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {' • '}{schedule.duration_minutes} phút
                          </span>
                        </div>
                        {schedule.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{schedule.location}</span>
                          </div>
                        )}
                        {schedule.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{schedule.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có lịch thi</p>
                {isAdmin && (
                  <Button variant="outline" className="mt-4" onClick={openCreateExamSchedule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo lịch thi đầu tiên
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tài liệu</CardTitle>
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
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Chưa có tài liệu</p>
                {canUpload && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload tài liệu đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              documents.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  document={doc}
                  canDelete={canUpload}
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
      <ImportStudentsDialog
        open={importStudentsOpen}
        onOpenChange={setImportStudentsOpen}
        courseId={Number(courseId)}
        courseName={course.name}
        onImportSuccess={loadCourseDetail}
      />

      <ManageExamScheduleDialog
        open={examScheduleDialogOpen}
        onOpenChange={handleExamScheduleDialogChange}
        courseId={Number(courseId)}
        courseName={course.name}
        schedule={editingExamSchedule}
        onSuccess={loadExamSchedules}
      />

      <AddUsersDialog
        open={addTeachersOpen}
        onOpenChange={setAddTeachersOpen}
        courseId={Number(courseId)}
        courseName={course.name}
        role="teacher"
        onSuccess={loadCourseDetail}
      />

      <AddUsersDialog
        open={addStudentsOpen}
        onOpenChange={setAddStudentsOpen}
        courseId={Number(courseId)}
        courseName={course.name}
        role="student"
        onSuccess={loadCourseDetail}
      />

      <RemoveUsersDialog
        open={removeTeachersOpen}
        onOpenChange={setRemoveTeachersOpen}
        courseId={Number(courseId)}
        courseName={course.name}
        users={course.teachers}
        role="teacher"
        enrollments={course.enrollments}
        onSuccess={loadCourseDetail}
      />

      <RemoveUsersDialog
        open={removeStudentsOpen}
        onOpenChange={setRemoveStudentsOpen}
        courseId={Number(courseId)}
        courseName={course.name}
        users={course.students}
        role="student"
        enrollments={course.enrollments}
        onSuccess={loadCourseDetail}
      />

      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        courseId={Number(courseId)}
        onUploadSuccess={handleUploadSuccess}
      />

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
    </div>
  );
}
