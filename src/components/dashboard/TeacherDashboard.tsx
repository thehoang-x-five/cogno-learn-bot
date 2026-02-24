import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BookOpen, Users, FileText, ClipboardList, TrendingUp,
  ArrowRight, Upload, Clock, MessageSquare, Sparkles, AlertCircle,
} from 'lucide-react';

const stats = [
  { name: 'Môn học đang dạy', value: '5', icon: BookOpen, color: 'text-primary' },
  { name: 'Tổng sinh viên', value: '234', icon: Users, color: 'text-accent' },
  { name: 'Tài liệu đã upload', value: '45', icon: FileText, color: 'text-warning' },
  { name: 'Quiz đã tạo', value: '12', icon: ClipboardList, color: 'text-info' },
];

const myCourses = [
  { id: '3', code: 'CS301', name: 'Lập trình OOP', students: 88, docs: 18, pendingQuestions: 5 },
  { id: '1', code: 'CS101', name: 'Nhập môn lập trình', students: 120, docs: 15, pendingQuestions: 12 },
  { id: '2', code: 'CS201', name: 'Cấu trúc dữ liệu', students: 95, docs: 22, pendingQuestions: 3 },
];

const pendingDocuments = [
  { name: 'giao_trinh_chuong5.pdf', course: 'CS301', status: 'processing' as const, progress: 67 },
  { name: 'bai_tap_tuan8.docx', course: 'CS101', status: 'pending' as const, progress: 0 },
];

const lowPerformanceStudents = [
  { name: 'Phạm Thị D', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=d', course: 'CS301', avgScore: 35, quizzes: 2 },
  { name: 'Võ Văn F', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=f', course: 'CS101', avgScore: 42, quizzes: 3 },
  { name: 'Trần Văn G', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=g', course: 'CS201', avgScore: 48, quizzes: 1 },
];

export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Courses */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Môn học của tôi</CardTitle>
                <CardDescription>Tổng quan hoạt động các môn đang dạy</CardDescription>
              </div>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-1">
                  Tất cả <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {myCourses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{course.name}</span>
                    <Badge variant="outline" className="text-xs">{course.code}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.students} SV</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{course.docs} tài liệu</span>
                  </div>
                </div>
                {course.pendingQuestions > 0 && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {course.pendingQuestions} câu hỏi mới
                  </Badge>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Pending Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Tài liệu đang xử lý
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingDocuments.map((doc, i) => (
              <div key={i} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{doc.name}</span>
                  <Badge variant="outline" className="text-xs">{doc.course}</Badge>
                </div>
                {doc.status === 'processing' ? (
                  <div className="flex items-center gap-2">
                    <Progress value={doc.progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground">{doc.progress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Chờ xử lý
                  </div>
                )}
              </div>
            ))}
            <Link to="/documents">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Upload className="h-4 w-4" />
                Upload tài liệu mới
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Low Performance Students */}
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Sinh viên cần hỗ trợ
          </CardTitle>
          <CardDescription>Sinh viên có điểm quiz dưới 50%</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {lowPerformanceStudents.map((student, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={student.avatar} />
                  <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.course}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">{student.avgScore}%</p>
                  <p className="text-xs text-muted-foreground">{student.quizzes} quiz</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
