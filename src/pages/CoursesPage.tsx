import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Course } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Search, Plus, Users, FileText, MoreVertical, MessageSquare, Grid3X3, List, Edit, Trash2, Copy, Share2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import CreateCourseDialog from '@/components/course/CreateCourseDialog';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import EditDialog, { EditField } from '@/components/shared/EditDialog';
import { cn } from '@/lib/utils';

const initialCourses: Course[] = [
  { id: '1', code: 'CS101', name: 'Nhập môn lập trình', description: 'Môn học cơ sở về lập trình với Python, bao gồm các khái niệm cơ bản như biến, vòng lặp, hàm...', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 2, studentCount: 120, documentCount: 15 },
  { id: '2', code: 'CS201', name: 'Cấu trúc dữ liệu và giải thuật', description: 'Học về các cấu trúc dữ liệu như mảng, danh sách liên kết, cây, đồ thị và các giải thuật sắp xếp, tìm kiếm...', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 1, studentCount: 95, documentCount: 22 },
  { id: '3', code: 'CS301', name: 'Lập trình hướng đối tượng', description: 'Các nguyên lý OOP: đóng gói, kế thừa, đa hình, trừu tượng. Thực hành với Java.', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'teacher', teacherCount: 1, studentCount: 88, documentCount: 18 },
  { id: '4', code: 'CS401', name: 'Cơ sở dữ liệu', description: 'Thiết kế và quản trị cơ sở dữ liệu quan hệ, SQL, normalization, indexing...', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 2, studentCount: 110, documentCount: 20 },
  { id: '5', code: 'CS501', name: 'Trí tuệ nhân tạo', description: 'Giới thiệu về AI, Machine Learning, Neural Networks và các ứng dụng thực tế.', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 1, studentCount: 75, documentCount: 12 },
  { id: '6', code: 'CS601', name: 'Phát triển Web', description: 'Full-stack web development với React, Node.js, và các công nghệ hiện đại.', semester: 'HK1-2025', isActive: false, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 2, studentCount: 130, documentCount: 25 },
];

const courseColors = ['bg-primary/10', 'bg-accent/10', 'bg-warning/10', 'bg-info/10', 'bg-destructive/10', 'bg-secondary'];
const courseTextColors = ['text-primary', 'text-accent', 'text-warning', 'text-info', 'text-destructive', 'text-muted-foreground'];

export default function CoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState(initialCourses);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  // Edit state
  const [editTarget, setEditTarget] = useState<Course | null>(null);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) || course.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'active' && course.isActive) || (filter === 'inactive' && !course.isActive);
    return matchesSearch && matchesFilter;
  });

  const canManageCourses = user?.role === 'admin' || user?.role === 'teacher';

  const handleDelete = () => {
    if (!deleteTarget) return;
    setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    toast({ title: 'Đã xóa', description: `Môn học "${deleteTarget.name}" đã được xóa thành công.` });
    setDeleteTarget(null);
  };

  const handleEdit = (values: Record<string, string>) => {
    if (!editTarget) return;
    setCourses((prev) => prev.map((c) =>
      c.id === editTarget.id ? { ...c, name: values.name, code: values.code, description: values.description, semester: values.semester } : c
    ));
    toast({ title: 'Đã cập nhật', description: `Môn học "${values.name}" đã được cập nhật.` });
    setEditTarget(null);
  };

  const handleShare = (course: Course) => {
    const url = `${window.location.origin}/courses/${course.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Đã sao chép link', description: `Link môn ${course.name} đã được sao chép vào clipboard.` });
  };

  const editFields: EditField[] = editTarget ? [
    { key: 'code', label: 'Mã môn học', value: editTarget.code, placeholder: 'VD: CS101' },
    { key: 'name', label: 'Tên môn học', value: editTarget.name, placeholder: 'Nhập tên môn học' },
    { key: 'description', label: 'Mô tả', value: editTarget.description, type: 'textarea', placeholder: 'Mô tả ngắn về môn học' },
    { key: 'semester', label: 'Học kỳ', value: editTarget.semester, placeholder: 'VD: HK1-2025' },
  ] : [];

  const renderCourseActions = (course: Course) => (
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course.id}`); }}>
        <BookOpen className="mr-2 h-4 w-4" />Xem chi tiết
      </DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate('/chat'); }}>
        <MessageSquare className="mr-2 h-4 w-4" />Chat về môn này
      </DropdownMenuItem>
      {canManageCourses && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditTarget(course); }}>
            <Edit className="mr-2 h-4 w-4" />Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(course.code); toast({ title: 'Đã sao chép', description: `Mã môn ${course.code} đã được sao chép.` }); }}>
            <Copy className="mr-2 h-4 w-4" />Sao chép mã
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShare(course); }}>
            <Share2 className="mr-2 h-4 w-4" />Chia sẻ
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(course); }}>
            <Trash2 className="mr-2 h-4 w-4" />Xóa
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Môn học</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'admin' ? 'Quản lý tất cả môn học trong hệ thống' : user?.role === 'teacher' ? 'Môn học bạn đang giảng dạy' : 'Các môn học bạn đang theo học'}
          </p>
        </div>
        {canManageCourses && (
          <Button variant="gradient" className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Thêm môn học
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm môn học..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'ghost'} size="sm" onClick={() => setFilter(f)} className="text-xs h-7">
              {f === 'all' ? 'Tất cả' : f === 'active' ? 'Đang mở' : 'Đã đóng'}
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

      <div className={cn(
        viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children' : 'space-y-3 stagger-children'
      )}>
        {filteredCourses.map((course, index) => (
          <Card key={course.id} className={cn(
            'hover-lift group cursor-pointer transition-all',
            viewMode === 'list' && 'flex flex-row items-center'
          )} onClick={() => navigate(`/courses/${course.id}`)}>
            {viewMode === 'grid' ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-xl ${courseColors[index % 6]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <BookOpen className={`h-6 w-6 ${courseTextColors[index % 6]}`} />
                      </div>
                      <div>
                        <Badge variant={course.isActive ? 'default' : 'secondary'} className="mb-1 text-[10px]">{course.code}</Badge>
                        <CardTitle className="text-base leading-tight">{course.name}</CardTitle>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
                    <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.studentCount} SV</div>
                    <div className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{course.documentCount} tài liệu</div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Badge variant="outline" className="text-[10px]">{course.semester}</Badge>
                    {course.enrollmentRole && (
                      <Badge variant={course.enrollmentRole === 'teacher' ? 'default' : 'secondary'} className="text-[10px]">
                        {course.enrollmentRole === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
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
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.studentCount}</span>
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{course.documentCount}</span>
                  <Badge variant="outline" className="text-[10px]">{course.semester}</Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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

      {filteredCourses.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium">Không tìm thấy môn học</h3>
          <p className="text-muted-foreground text-sm mt-1">Thử tìm kiếm với từ khóa khác</p>
        </div>
      )}

      <CreateCourseDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa môn học"
        description={`Bạn có chắc chắn muốn xóa môn "${deleteTarget?.name}"? Hành động này không thể hoàn tác. Tất cả tài liệu, quiz và dữ liệu liên quan sẽ bị xóa.`}
        onConfirm={handleDelete}
      />

      <EditDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="Chỉnh sửa môn học"
        description="Cập nhật thông tin môn học"
        fields={editFields}
        onSave={handleEdit}
      />
    </div>
  );
}
