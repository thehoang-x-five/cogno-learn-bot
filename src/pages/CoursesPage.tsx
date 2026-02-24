import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Course } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Search, Plus, Users, FileText, MoreVertical, MessageSquare,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CreateCourseDialog from '@/components/course/CreateCourseDialog';

const mockCourses: Course[] = [
  { id: '1', code: 'CS101', name: 'Nhập môn lập trình', description: 'Môn học cơ sở về lập trình với Python, bao gồm các khái niệm cơ bản như biến, vòng lặp, hàm...', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 2, studentCount: 120, documentCount: 15 },
  { id: '2', code: 'CS201', name: 'Cấu trúc dữ liệu và giải thuật', description: 'Học về các cấu trúc dữ liệu như mảng, danh sách liên kết, cây, đồ thị và các giải thuật sắp xếp, tìm kiếm...', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 1, studentCount: 95, documentCount: 22 },
  { id: '3', code: 'CS301', name: 'Lập trình hướng đối tượng', description: 'Các nguyên lý OOP: đóng gói, kế thừa, đa hình, trừu tượng. Thực hành với Java.', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'teacher', teacherCount: 1, studentCount: 88, documentCount: 18 },
  { id: '4', code: 'CS401', name: 'Cơ sở dữ liệu', description: 'Thiết kế và quản trị cơ sở dữ liệu quan hệ, SQL, normalization, indexing...', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 2, studentCount: 110, documentCount: 20 },
  { id: '5', code: 'CS501', name: 'Trí tuệ nhân tạo', description: 'Giới thiệu về AI, Machine Learning, Neural Networks và các ứng dụng thực tế.', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 1, studentCount: 75, documentCount: 12 },
  { id: '6', code: 'CS601', name: 'Phát triển Web', description: 'Full-stack web development với React, Node.js, và các công nghệ hiện đại.', semester: 'HK1-2025', isActive: false, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 2, studentCount: 130, documentCount: 25 },
];

export default function CoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredCourses = mockCourses.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) || course.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'active' && course.isActive) || (filter === 'inactive' && !course.isActive);
    return matchesSearch && matchesFilter;
  });

  const canManageCourses = user?.role === 'admin' || user?.role === 'teacher';

  return (
    <div className="p-8 space-y-6">
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
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Tất cả' : f === 'active' ? 'Đang mở' : 'Đã đóng'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="hover-lift group cursor-pointer" onClick={() => navigate(`/courses/${course.id}`)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <Badge variant={course.isActive ? 'default' : 'secondary'} className="mb-1">{course.code}</Badge>
                    <CardTitle className="text-lg leading-tight">{course.name}</CardTitle>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}`)}>Xem chi tiết</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/chat')}><MessageSquare className="mr-2 h-4 w-4" />Chat về môn này</DropdownMenuItem>
                    {canManageCourses && (<><DropdownMenuItem>Chỉnh sửa</DropdownMenuItem><DropdownMenuItem className="text-destructive">Xóa</DropdownMenuItem></>)}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="line-clamp-2 mb-4">{course.description}</CardDescription>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><Users className="h-4 w-4" />{course.studentCount} SV</div>
                <div className="flex items-center gap-1"><FileText className="h-4 w-4" />{course.documentCount} tài liệu</div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Badge variant="outline" className="text-xs">{course.semester}</Badge>
                {course.enrollmentRole && (
                  <Badge variant={course.enrollmentRole === 'teacher' ? 'default' : 'secondary'} className="text-xs">
                    {course.enrollmentRole === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Không tìm thấy môn học</h3>
          <p className="text-muted-foreground text-sm mt-1">Thử tìm kiếm với từ khóa khác</p>
        </div>
      )}

      <CreateCourseDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
