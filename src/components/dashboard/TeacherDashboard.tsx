import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BookOpen, Users, FileText, ClipboardList,
  ArrowRight, Upload, Clock, MessageSquare, AlertCircle,
} from 'lucide-react';

export default function TeacherDashboard() {
  const { t, language } = useLanguage();

  const stats = [
    { name: t('teacher.coursesTaught'), value: '5', icon: BookOpen, color: 'text-primary' },
    { name: t('teacher.totalStudents'), value: '234', icon: Users, color: 'text-accent' },
    { name: t('teacher.docsUploaded'), value: '45', icon: FileText, color: 'text-warning' },
    { name: t('teacher.quizzesCreated'), value: '12', icon: ClipboardList, color: 'text-info' },
  ];

  const myCourses = [
    { id: '3', code: 'CS301', name: language === 'vi' ? 'Lập trình OOP' : 'OOP Programming', students: 88, docs: 18, pendingQuestions: 5 },
    { id: '1', code: 'CS101', name: language === 'vi' ? 'Nhập môn lập trình' : 'Intro to Programming', students: 120, docs: 15, pendingQuestions: 12 },
    { id: '2', code: 'CS201', name: language === 'vi' ? 'Cấu trúc dữ liệu' : 'Data Structures', students: 95, docs: 22, pendingQuestions: 3 },
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
                <CardTitle>{t('teacher.myCourses')}</CardTitle>
                <CardDescription>{t('teacher.myCoursesDesc')}</CardDescription>
              </div>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-1">
                  {t('action.viewAll')} <ArrowRight className="h-4 w-4" />
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
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{course.docs} {t('courses.docs')}</span>
                  </div>
                </div>
                {course.pendingQuestions > 0 && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {course.pendingQuestions} {t('teacher.pendingQuestions')}
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
              {t('teacher.pendingDocs')}
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
                    {t('teacher.waitingProcess')}
                  </div>
                )}
              </div>
            ))}
            <Link to="/documents">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Upload className="h-4 w-4" />
                {t('teacher.uploadNewDoc')}
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
            {t('teacher.lowPerformance')}
          </CardTitle>
          <CardDescription>{t('teacher.lowPerformanceDesc')}</CardDescription>
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
