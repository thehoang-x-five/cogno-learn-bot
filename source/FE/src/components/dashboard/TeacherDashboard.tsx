import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StatCard from '@/components/shared/StatCard';
import { courseService } from '@/services/courseService';
import { documentService } from '@/services/documentService';
import { dashboardMeService, type MyDashboardStats } from '@/services/dashboardMeService';
import type { Course } from '@/types/course';
import type { Document } from '@/types/document';
import {
  BookOpen, Users, FileText, ClipboardList,
  ArrowRight, Upload, Clock,
} from 'lucide-react';

export default function TeacherDashboard() {
  const { t, language } = useLanguage();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<Document[]>([]);
  const [myStats, setMyStats] = useState<MyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesResponse, docsResponse, stats] = await Promise.all([
        courseService.getMyCourses(0, 10),
        documentService.list({ limit: 100 }),
        dashboardMeService.getMyStats(),
      ]);
      setMyCourses(coursesResponse.items);
      setMyStats(stats);

      const courseIds = new Set(coursesResponse.items.map((c) => c.id));
      const pending = docsResponse.items.filter(
        (doc) =>
          courseIds.has(doc.course_id) &&
          (doc.status === 'PENDING' || doc.status === 'PROCESSING')
      );
      setPendingDocuments(pending);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString(locale);

  const stats = [
    {
      name: t('teacher.coursesTaught'),
      value: fmt(myStats?.courses_count ?? myCourses.length),
      icon: BookOpen,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      name: t('teacher.totalStudents'),
      value: fmt(myStats?.total_students ?? 0),
      icon: Users,
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
    },
    {
      name: t('teacher.docsUploaded'),
      value: fmt(myStats?.documents_total ?? 0),
      icon: FileText,
      iconColor: 'text-warning',
      iconBg: 'bg-warning/10',
    },
    {
      name: t('teacher.quizzesCreated'),
      value: fmt(myStats?.quizzes_count ?? 0),
      icon: ClipboardList,
      iconColor: 'text-info',
      iconBg: 'bg-info/10',
    },
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
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">Đang tải...</p>
            ) : myCourses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Chưa có khóa học nào</p>
            ) : (
              myCourses.slice(0, 3).map((course) => (
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
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {course.semester || 'N/A'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
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
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">Đang tải...</p>
            ) : pendingDocuments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Không có tài liệu đang xử lý</p>
            ) : (
              pendingDocuments.slice(0, 2).map((doc) => (
                <div key={doc.id} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{doc.filename}</span>
                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">{doc.course_name}</Badge>
                  </div>
                  {doc.status === 'PROCESSING' ? (
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
              ))
            )}
            <Link to="/documents" className="block">
              <Button variant="outline" size="sm" className="w-full gap-2 mt-1">
                <Upload className="h-4 w-4" />
                {t('teacher.uploadNewDoc')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
