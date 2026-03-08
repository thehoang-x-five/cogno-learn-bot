import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Document, DocumentStatus } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, FileText, Users, ClipboardList, Upload, Search, MoreVertical, Download, Trash2, Eye,
  CheckCircle2, Clock, AlertCircle, Loader2, File, FileType, UserPlus, GraduationCap, BookOpen, Play,
  Calendar, TrendingUp, MessageSquare, Settings, Edit, Copy, Share2, BarChart3,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import EditDialog, { EditField } from '@/components/shared/EditDialog';
import PreviewDialog from '@/components/shared/PreviewDialog';
import StudentDetailDialog from '@/components/shared/StudentDetailDialog';

// Mock data
const initialCourse = {
  id: '1', code: 'CS101', name: 'Nhập môn lập trình',
  description: 'Môn học cơ sở về lập trình cho sinh viên năm nhất. Giới thiệu các khái niệm cơ bản về lập trình, cấu trúc dữ liệu đơn giản và thuật toán.',
  semester: 'HK1-2025', isActive: true, studentsCount: 45, documentsCount: 8, quizzesCount: 5,
};

const initialDocuments: Document[] = [
  { id: '1', courseId: '1', uploadedBy: '2', filename: 'slide_chuong1_intro.pdf', filePath: '/docs/1', fileType: 'pdf', fileSize: 2048000, status: 'ready', totalChunks: 45, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', courseId: '1', uploadedBy: '2', filename: 'slide_chuong2_variables.pdf', filePath: '/docs/2', fileType: 'pdf', fileSize: 3145728, status: 'ready', totalChunks: 62, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', courseId: '1', uploadedBy: '2', filename: 'bai_tap_chuong1.docx', filePath: '/docs/3', fileType: 'docx', fileSize: 524288, status: 'processing', totalChunks: 0, createdAt: new Date(Date.now() - 3600000).toISOString() },
];

const initialStudents = [
  { id: '1', fullName: 'Nguyễn Văn A', email: 'a.nguyen@edu.vn', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=a', progress: 85, quizzesTaken: 4, lastActive: '2 giờ trước' },
  { id: '2', fullName: 'Trần Thị B', email: 'b.tran@edu.vn', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=b', progress: 72, quizzesTaken: 3, lastActive: '1 ngày trước' },
  { id: '3', fullName: 'Lê Văn C', email: 'c.le@edu.vn', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=c', progress: 90, quizzesTaken: 5, lastActive: '30 phút trước' },
  { id: '4', fullName: 'Phạm Thị D', email: 'd.pham@edu.vn', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=d', progress: 45, quizzesTaken: 2, lastActive: '3 ngày trước' },
  { id: '5', fullName: 'Hoàng Văn E', email: 'e.hoang@edu.vn', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=e', progress: 60, quizzesTaken: 3, lastActive: '5 giờ trước' },
];

const initialQuizzes = [
  { id: '1', title: 'Quiz Chương 1: Giới thiệu', questionsCount: 10, attempts: 38, avgScore: 75, createdAt: '2025-01-15' },
  { id: '2', title: 'Quiz Chương 2: Biến và kiểu dữ liệu', questionsCount: 15, attempts: 35, avgScore: 68, createdAt: '2025-01-20' },
  { id: '3', title: 'Quiz Chương 3: Cấu trúc điều khiển', questionsCount: 12, attempts: 30, avgScore: 72, createdAt: '2025-01-25' },
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

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState(initialCourse);
  const [documents, setDocuments] = useState(initialDocuments);
  const [students, setStudents] = useState(initialStudents);
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  // Dialog states
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState<Document | null>(null);
  const [previewDocTarget, setPreviewDocTarget] = useState<Document | null>(null);
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<typeof initialQuizzes[0] | null>(null);
  const [editQuizTarget, setEditQuizTarget] = useState<typeof initialQuizzes[0] | null>(null);
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<typeof initialStudents[0] | null>(null);
  const [viewStudentTarget, setViewStudentTarget] = useState<typeof initialStudents[0] | null>(null);
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);

  const courseEditFields: EditField[] = [
    { key: 'code', label: 'Mã môn học', value: course.code },
    { key: 'name', label: 'Tên môn học', value: course.name },
    { key: 'description', label: 'Mô tả', value: course.description, type: 'textarea' },
    { key: 'semester', label: 'Học kỳ', value: course.semester },
  ];

  const quizEditFields: EditField[] = editQuizTarget ? [
    { key: 'title', label: 'Tên quiz', value: editQuizTarget.title },
  ] : [];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/courses')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-base font-mono">{course.code}</Badge>
            <h1 className="text-3xl font-bold">{course.name}</h1>
            {course.isActive && <Badge className="bg-success/10 text-success border-success/20">Đang hoạt động</Badge>}
          </div>
          <p className="text-muted-foreground mt-1">{course.semester} • {course.description}</p>
        </div>
        {isTeacher && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2"><Settings className="h-4 w-4" />Cài đặt</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditCourseOpen(true)}><Edit className="mr-2 h-4 w-4" />Chỉnh sửa thông tin</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(course.code); toast({ title: 'Đã sao chép', description: `Mã môn: ${course.code}` }); }}>
                <Copy className="mr-2 h-4 w-4" />Sao chép mã môn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/courses/${id}`); toast({ title: 'Đã sao chép link', description: 'Link môn học đã được sao chép.' }); }}>
                <Share2 className="mr-2 h-4 w-4" />Chia sẻ liên kết
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCourseOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />Xóa môn học
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { icon: Users, label: 'Sinh viên', value: course.studentsCount },
          { icon: FileText, label: 'Tài liệu', value: course.documentsCount },
          { icon: ClipboardList, label: 'Quiz', value: course.quizzesCount },
          { icon: TrendingUp, label: 'Điểm TB', value: '72%', isSuccess: true },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><s.icon className="h-4 w-4" />{s.label}</CardDescription></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${s.isSuccess ? 'text-success' : ''}`}>{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><BookOpen className="h-4 w-4" />Tổng quan</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" />Tài liệu</TabsTrigger>
          <TabsTrigger value="quizzes" className="gap-2"><ClipboardList className="h-4 w-4" />Quiz</TabsTrigger>
          {isTeacher && <TabsTrigger value="students" className="gap-2"><Users className="h-4 w-4" />Sinh viên</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Hoạt động gần đây</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: FileText, text: 'Đã tải lên slide_chuong3.pdf', time: '2 giờ trước' },
                  { icon: ClipboardList, text: 'Quiz Chương 2 đã hoàn thành bởi 5 SV', time: '5 giờ trước' },
                  { icon: MessageSquare, text: '12 câu hỏi mới từ sinh viên', time: '1 ngày trước' },
                  { icon: Users, text: '3 sinh viên mới đăng ký', time: '2 ngày trước' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <activity.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.text}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Lịch thi</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { type: 'Giữa kỳ', date: '15/03/2025', time: '08:00 - 10:00', room: 'A305' },
                  { type: 'Cuối kỳ', date: '20/05/2025', time: '13:00 - 15:00', room: 'A201' },
                ].map((exam, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{exam.type}</Badge>
                      <span className="text-sm text-muted-foreground">{exam.room}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{exam.date}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{exam.time}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Truy cập nhanh</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-auto py-6 flex-col gap-2" onClick={() => navigate('/chat')}>
                  <MessageSquare className="h-8 w-8 text-primary" /><span className="font-medium">Chat AI</span>
                  <span className="text-xs text-muted-foreground">Hỏi đáp với trợ lý AI</span>
                </Button>
                <Button variant="outline" className="h-auto py-6 flex-col gap-2" onClick={() => setActiveTab('quizzes')}>
                  <Play className="h-8 w-8 text-success" /><span className="font-medium">Làm Quiz</span>
                  <span className="text-xs text-muted-foreground">{quizzes.length} quiz có sẵn</span>
                </Button>
                <Button variant="outline" className="h-auto py-6 flex-col gap-2" onClick={() => setActiveTab('documents')}>
                  <FileText className="h-8 w-8 text-warning" /><span className="font-medium">Xem tài liệu</span>
                  <span className="text-xs text-muted-foreground">{documents.length} tài liệu</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {isTeacher && (
            <Card className={`border-2 border-dashed transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); toast({ title: 'Đã nhận file', description: 'File đang được xử lý.' }); }}>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium mb-1">Tải lên tài liệu</p>
                <p className="text-sm text-muted-foreground mb-3">Kéo thả file hoặc click để chọn</p>
                <Button variant="outline" size="sm">Chọn file</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên file</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tải</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const status = statusConfig[doc.status];
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell><div className="flex items-center gap-3">{getFileIcon(doc.fileType)}<span className="font-medium">{doc.filename}</span></div></TableCell>
                      <TableCell className="text-muted-foreground">{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        {doc.status === 'processing' ? (
                          <div className="flex items-center gap-2"><Progress value={45} className="w-16 h-2" /><span className="text-xs text-muted-foreground">45%</span></div>
                        ) : (<span>{doc.totalChunks || '-'}</span>)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${status.className}`}>
                          <StatusIcon className={`h-3 w-3 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />{status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewDocTarget(doc)}><Eye className="mr-2 h-4 w-4" />Xem trước</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast({ title: 'Đang tải xuống', description: `${doc.filename} đang được tải...` })}><Download className="mr-2 h-4 w-4" />Tải xuống</DropdownMenuItem>
                            {isTeacher && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDocTarget(doc)}><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm quiz..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            {isTeacher && <Button className="gap-2"><ClipboardList className="h-4 w-4" />Tạo Quiz mới</Button>}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <CardDescription>{quiz.questionsCount} câu hỏi • Tạo ngày {quiz.createdAt}</CardDescription>
                    </div>
                    {isTeacher && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate('/quizzes')}><Eye className="mr-2 h-4 w-4" />Xem trước</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditQuizTarget(quiz)}><Edit className="mr-2 h-4 w-4" />Chỉnh sửa</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { const newQ = { ...quiz, id: Date.now().toString(), title: `${quiz.title} (bản sao)` }; setQuizzes(prev => [...prev, newQ]); toast({ title: 'Đã nhân bản', description: `Quiz "${quiz.title}" đã được nhân bản.` }); }}>
                            <Copy className="mr-2 h-4 w-4" />Nhân bản
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteQuizTarget(quiz)}><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center"><p className="text-2xl font-bold">{quiz.attempts}</p><p className="text-xs text-muted-foreground">Lượt làm</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-success">{quiz.avgScore}%</p><p className="text-xs text-muted-foreground">Điểm TB</p></div>
                  </div>
                  <Button className="w-full gap-2" onClick={() => navigate('/quizzes')}>
                    <Play className="h-4 w-4" />{isTeacher ? 'Xem kết quả' : 'Làm bài'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Students Tab */}
        {isTeacher && (
          <TabsContent value="students" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tìm kiếm sinh viên..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                <DialogTrigger asChild><Button className="gap-2"><UserPlus className="h-4 w-4" />Thêm sinh viên</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm sinh viên vào môn học</DialogTitle>
                    <DialogDescription>Nhập email sinh viên để thêm vào môn {course.name}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Email sinh viên</Label>
                      <Input placeholder="email@edu.vn" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>Hủy</Button>
                    <Button onClick={() => { setIsEnrollDialogOpen(false); toast({ title: 'Đã thêm', description: 'Sinh viên đã được thêm vào môn học.' }); }}>Thêm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sinh viên</TableHead>
                    <TableHead>Tiến độ</TableHead>
                    <TableHead>Quiz đã làm</TableHead>
                    <TableHead>Hoạt động cuối</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9"><AvatarImage src={student.avatarUrl} /><AvatarFallback>{student.fullName.charAt(0)}</AvatarFallback></Avatar>
                          <div><p className="font-medium">{student.fullName}</p><p className="text-sm text-muted-foreground">{student.email}</p></div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2"><Progress value={student.progress} className="w-24 h-2" /><span className="text-sm font-medium">{student.progress}%</span></div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{student.quizzesTaken}/{quizzes.length}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{student.lastActive}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewStudentTarget(student)}><Eye className="mr-2 h-4 w-4" />Xem chi tiết</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/chat')}><MessageSquare className="mr-2 h-4 w-4" />Gửi tin nhắn</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteStudentTarget(student)}><Trash2 className="mr-2 h-4 w-4" />Xóa khỏi môn</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* All Dialogs */}
      <EditDialog
        open={editCourseOpen}
        onOpenChange={setEditCourseOpen}
        title="Chỉnh sửa môn học"
        description="Cập nhật thông tin môn học"
        fields={courseEditFields}
        onSave={(values) => {
          setCourse((prev) => ({ ...prev, code: values.code, name: values.name, description: values.description, semester: values.semester }));
          toast({ title: 'Đã cập nhật', description: 'Thông tin môn học đã được lưu.' });
        }}
      />

      <ConfirmDeleteDialog
        open={deleteCourseOpen}
        onOpenChange={setDeleteCourseOpen}
        title="Xóa môn học"
        description={`Bạn có chắc chắn muốn xóa "${course.name}"? Tất cả dữ liệu liên quan sẽ bị mất.`}
        onConfirm={() => { toast({ title: 'Đã xóa', description: 'Môn học đã được xóa.' }); navigate('/courses'); }}
      />

      <ConfirmDeleteDialog
        open={!!deleteDocTarget}
        onOpenChange={(open) => !open && setDeleteDocTarget(null)}
        title="Xóa tài liệu"
        description={`Bạn có chắc chắn muốn xóa "${deleteDocTarget?.filename}"?`}
        onConfirm={() => { setDocuments((prev) => prev.filter((d) => d.id !== deleteDocTarget?.id)); toast({ title: 'Đã xóa', description: 'Tài liệu đã được xóa.' }); setDeleteDocTarget(null); }}
      />

      <PreviewDialog
        open={!!previewDocTarget}
        onOpenChange={(open) => !open && setPreviewDocTarget(null)}
        filename={previewDocTarget?.filename || ''}
        fileType={previewDocTarget?.fileType || ''}
        fileSize={previewDocTarget ? formatFileSize(previewDocTarget.fileSize) : ''}
      />

      <ConfirmDeleteDialog
        open={!!deleteQuizTarget}
        onOpenChange={(open) => !open && setDeleteQuizTarget(null)}
        title="Xóa quiz"
        description={`Bạn có chắc chắn muốn xóa "${deleteQuizTarget?.title}"?`}
        onConfirm={() => { setQuizzes((prev) => prev.filter((q) => q.id !== deleteQuizTarget?.id)); toast({ title: 'Đã xóa', description: 'Quiz đã được xóa.' }); setDeleteQuizTarget(null); }}
      />

      <EditDialog
        open={!!editQuizTarget}
        onOpenChange={(open) => !open && setEditQuizTarget(null)}
        title="Chỉnh sửa quiz"
        fields={quizEditFields}
        onSave={(values) => { setQuizzes((prev) => prev.map((q) => q.id === editQuizTarget?.id ? { ...q, title: values.title } : q)); toast({ title: 'Đã cập nhật', description: 'Quiz đã được cập nhật.' }); setEditQuizTarget(null); }}
      />

      <ConfirmDeleteDialog
        open={!!deleteStudentTarget}
        onOpenChange={(open) => !open && setDeleteStudentTarget(null)}
        title="Xóa sinh viên khỏi môn"
        description={`Bạn có chắc chắn muốn xóa "${deleteStudentTarget?.fullName}" khỏi môn ${course.name}?`}
        onConfirm={() => { setStudents((prev) => prev.filter((s) => s.id !== deleteStudentTarget?.id)); toast({ title: 'Đã xóa', description: 'Sinh viên đã được xóa khỏi môn học.' }); setDeleteStudentTarget(null); }}
      />

      <StudentDetailDialog
        open={!!viewStudentTarget}
        onOpenChange={(open) => !open && setViewStudentTarget(null)}
        student={viewStudentTarget}
        totalQuizzes={quizzes.length}
      />
    </div>
  );
}
