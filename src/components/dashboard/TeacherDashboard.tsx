import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StatCard from '@/components/shared/StatCard';
import {
  BookOpen, Users, FileText, ClipboardList,
  ArrowRight, Upload, Clock, MessageSquare, AlertTriangle,
} from 'lucide-react';

export default function TeacherDashboard() {
  const { t, language } = useLanguage();

  const stats = [
    { name: t('teacher.coursesTaught'), value: '5', icon: BookOpen, iconColor: 'text-primary', iconBg: 'bg-primary/10' },
    { name: t('teacher.totalStudents'), value: '234', icon: Users, iconColor: 'text-accent', iconBg: 'bg-accent/10' },
    { name: t('teacher.docsUploaded'), value: '45', icon: FileText, iconColor: 'text-warning', iconBg: 'bg-warning/10' },
    { name: t('teacher.quizzesCreated'), value: '12', icon: ClipboardList, iconColor: 'text-info', iconBg: 'bg-info/10' },
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
    <div className="space-y-6 sm:space-y-8">
      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
        {stats.map((stat) => (
          <StatCard key={stat.name} title={stat.name} value={stat.value} icon={stat.icon} iconColor={stat.iconColor} iconBg={stat.iconBg} />
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* My Courses */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t('teacher.myCourses')}</CardTitle>
                <CardDescription className="mt-0.5">{t('teacher.myCoursesDesc')}</CardDescription>
              </div>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  {t('action.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {myCourses.map((course) => (
              <Link
                key={course.id} to={`/courses/${course.id}`}
                className="flex items-center gap-4 p-3.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-all group"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{course.name}</span>
                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">{course.code}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.students}</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{course.docs} {t('courses.docs')}</span>
                  </div>
                </div>
                {course.pendingQuestions > 0 && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-[10px] h-5 shrink-0">
                    <MessageSquare className="h-3 w-3" />
                    {course.pendingQuestions}
                  </Badge>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Pending Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-primary" />
              {t('teacher.pendingDocs')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingDocuments.map((doc, i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{doc.name}</span>
                  <Badge variant="outline" className="text-[10px] h-5 shrink-0">{doc.course}</Badge>
                </div>
                {doc.status === 'processing' ? (
                  <div className="flex items-center gap-2">
                    <Progress value={doc.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground font-mono">{doc.progress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {t('teacher.waitingProcess')}
                  </div>
                )}
              </div>
            ))}
            <Link to="/documents" className="block">
              <Button variant="outline" size="sm" className="w-full gap-2 mt-1">
                <Upload className="h-4 w-4" />
                {t('teacher.uploadNewDoc')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Low Performance Students */}
      <Card className="border-warning/20 bg-gradient-to-r from-warning/5 via-transparent to-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-warning" />
            {t('teacher.lowPerformance')}
          </CardTitle>
          <CardDescription>{t('teacher.lowPerformanceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {lowPerformanceStudents.map((student, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:shadow-sm transition-shadow">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={student.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.course}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">{student.avgScore}%</p>
                  <p className="text-[10px] text-muted-foreground">{student.quizzes} quiz</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
