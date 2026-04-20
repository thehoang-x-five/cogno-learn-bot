import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { courseService } from '@/services/courseService';
import { userService } from '@/services/userService';
import { getApiErrorDetail } from '@/services/apiClient';
import type { User } from '@/types/course';

interface CreateCourseWithEnrollmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCourseWithEnrollmentsDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCourseWithEnrollmentsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    semester: '',
    is_active: true,
    teacher_ids: [] as number[],
    student_ids: [] as number[],
  });

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      const teacherResponse = await userService.list({ role: 'teacher', limit: 500, is_active: true });
      setTeachers(teacherResponse.items);

      const studentResponse = await userService.list({ role: 'student', limit: 500, is_active: true });
      setStudents(studentResponse.items);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await courseService.createWithEnrollments(formData);
      
      toast({
        title: 'Thành công',
        description: `Đã tạo khóa học "${formData.name}" với ${formData.teacher_ids.length} giáo viên và ${formData.student_ids.length} học sinh`,
      });
      
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        semester: '',
        is_active: true,
        teacher_ids: [],
        student_ids: [],
      });
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: getApiErrorDetail(error, 'Không thể tạo khóa học'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTeacher = (teacherId: number) => {
    setFormData(prev => ({
      ...prev,
      teacher_ids: prev.teacher_ids.includes(teacherId)
        ? prev.teacher_ids.filter(id => id !== teacherId)
        : [...prev.teacher_ids, teacherId]
    }));
  };

  const toggleStudent = (studentId: number) => {
    setFormData(prev => ({
      ...prev,
      student_ids: prev.student_ids.includes(studentId)
        ? prev.student_ids.filter(id => id !== studentId)
        : [...prev.student_ids, studentId]
    }));
  };

  const removeTeacher = (teacherId: number) => {
    setFormData(prev => ({
      ...prev,
      teacher_ids: prev.teacher_ids.filter(id => id !== teacherId)
    }));
  };

  const removeStudent = (studentId: number) => {
    setFormData(prev => ({
      ...prev,
      student_ids: prev.student_ids.filter(id => id !== studentId)
    }));
  };

  const selectedTeachers = teachers.filter(t => formData.teacher_ids.includes(t.id));
  const selectedStudents = students.filter(s => formData.student_ids.includes(s.id));

  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = teacherSearch.toLowerCase();
    return (
      teacher.full_name?.toLowerCase().includes(searchLower) ||
      teacher.email.toLowerCase().includes(searchLower)
    );
  });

  const filteredStudents = students.filter(student => {
    const searchLower = studentSearch.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo khóa học mới</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Course Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Mã khóa học *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  placeholder="VD: CS101"
                />
              </div>

              <div>
                <Label htmlFor="semester">Học kỳ</Label>
                <Input
                  id="semester"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  placeholder="VD: 2024-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="name">Tên khóa học *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="VD: Lập trình Python"
              />
            </div>

            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả về khóa học..."
                rows={3}
              />
            </div>

            {/* Teachers */}
            <div>
              <Label>Giáo viên</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 mt-2"
                onClick={() => setShowTeacherDialog(true)}
              >
                <UserPlus className="h-4 w-4" />
                Thêm giáo viên
              </Button>
              
              {selectedTeachers.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {teacher.full_name || teacher.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {teacher.email}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTeacher(teacher.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Students */}
            <div>
              <Label>Học sinh</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 mt-2"
                onClick={() => setShowStudentDialog(true)}
              >
                <UserPlus className="h-4 w-4" />
                Thêm học sinh
              </Button>
              
              {selectedStudents.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {student.full_name || student.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {student.email}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStudent(student.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo khóa học'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Teacher Selection Dialog */}
      <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn giáo viên</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {filteredTeachers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {teacherSearch ? 'Không tìm thấy giáo viên' : 'Không có giáo viên'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleTeacher(teacher.id)}
                    >
                      <Checkbox
                        checked={formData.teacher_ids.includes(teacher.id)}
                        onCheckedChange={() => toggleTeacher(teacher.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {teacher.full_name || teacher.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {teacher.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setShowTeacherDialog(false);
                setTeacherSearch('');
              }}
            >
              Xong ({formData.teacher_ids.length} đã chọn)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Selection Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn học sinh</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {studentSearch ? 'Không tìm thấy học sinh' : 'Không có học sinh'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleStudent(student.id)}
                    >
                      <Checkbox
                        checked={formData.student_ids.includes(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {student.full_name || student.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {student.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setShowStudentDialog(false);
                setStudentSearch('');
              }}
            >
              Xong ({formData.student_ids.length} đã chọn)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
