import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StatCard from '@/components/shared/StatCard';
import {
  BookOpen, MessageSquare, ClipboardList, Star, ArrowRight,
  Sparkles, Trophy, Target, Flame, Calendar, Clock, Play,
} from 'lucide-react';

export default function StudentDashboard() {
  const { t, language } = useLanguage();

  const stats = [
    { name: t('student.courses'), value: '6', icon: BookOpen, iconColor: 'text-primary', iconBg: 'bg-primary/10' },
    { name: t('student.questionsAsked'), value: '89', icon: MessageSquare, iconColor: 'text-accent', iconBg: 'bg-accent/10' },
    { name: t('student.quizCompleted'), value: '23', icon: ClipboardList, iconColor: 'text-warning', iconBg: 'bg-warning/10' },
    { name: t('student.avgScore'), value: '8.5', icon: Star, iconColor: 'text-info', iconBg: 'bg-info/10' },
  ];

  const courses = [
    { id: '1', code: 'CS101', name: language === 'vi' ? 'Nhập môn lập trình' : 'Intro to Programming', progress: 75, nextQuiz: 'Quiz Chương 4' },
    { id: '2', code: 'CS201', name: language === 'vi' ? 'Cấu trúc dữ liệu' : 'Data Structures', progress: 45, nextQuiz: 'Quiz Chương 3' },
    { id: '3', code: 'CS301', name: language === 'vi' ? 'Lập trình hướng đối tượng' : 'OOP Programming', progress: 90, nextQuiz: null },
  ];

  const upcomingQuizzes = [
    { title: language === 'vi' ? 'Quiz Chương 4 - Hàm' : 'Quiz Chapter 4 - Functions', course: 'CS101', dueDate: '28/02/2026', questions: 10 },
    { title: language === 'vi' ? 'Quiz Cây nhị phân' : 'Binary Tree Quiz', course: 'CS201', dueDate: '01/03/2026', questions: 8 },
  ];

  const recentQuizResults = [
    { title: language === 'vi' ? 'Quiz Chương 3 - Vòng lặp' : 'Quiz Chapter 3 - Loops', course: 'CS101', score: 9, total: 10, date: '22/02/2026' },
    { title: language === 'vi' ? 'Quiz Tính chất OOP' : 'OOP Properties Quiz', course: 'CS301', score: 8, total: 10, date: '20/02/2026' },
    { title: 'Quiz Linked List', course: 'CS201', score: 6, total: 10, date: '18/02/2026' },
  ];

  const studyStreak = { current: 7, best: 14 };

  const examSchedule = [
    { course: 'CS101', type: t('courseDetail.midterm'), date: '15/03/2026', time: '08:00', room: 'A305', daysLeft: 19 },
    { course: 'CS301', type: t('courseDetail.midterm'), date: '18/03/2026', time: '13:00', room: 'B201', daysLeft: 22 },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
        {stats.map((stat) => (
          <StatCard key={stat.name} title={stat.name} value={stat.value} icon={stat.icon} iconColor={stat.iconColor} iconBg={stat.iconBg} />
        ))}
      </div>

      {/* Study Streak + CTA */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-warning/5 via-transparent to-warning/5 border-warning/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0">
              <Flame className="h-7 w-7 text-warning" />
            </div>
            <div>
              <p className="text-3xl font-bold">{studyStreak.current} <span className="text-base font-medium text-muted-foreground">{t('student.days')}</span></p>
              <p className="text-sm text-muted-foreground">{t('student.studyStreak')} · {t('student.streakRecord')}: {studyStreak.best}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-primary/15">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{t('student.askAINow')}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{t('student.askAIDesc')}</p>
            </div>
            <Link to="/chat">
              <Button variant="gradient" size="lg" className="gap-2 shrink-0">
                <Sparkles className="h-5 w-5" />
                <span className="hidden sm:inline">{t('student.chatWithAI')}</span>
                <span className="sm:hidden">Chat AI</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Courses Progress */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t('student.progress')}</CardTitle>
                <CardDescription className="mt-0.5">{t('student.progressDesc')}</CardDescription>
              </div>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  {t('action.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {courses.map((course) => (
              <Link
                key={course.id} to={`/courses/${course.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-medium text-sm truncate">{course.name}</p>
                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">{course.code}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={course.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium text-muted-foreground w-8">{course.progress}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Quiz Results */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t('student.recentResults')}</CardTitle>
                <CardDescription className="mt-0.5">{t('student.recentResultsDesc')}</CardDescription>
              </div>
              <Link to="/quizzes">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  {t('action.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentQuizResults.map((result, i) => {
              const pct = result.score / result.total;
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      pct >= 0.8 ? 'bg-accent/10' : pct >= 0.5 ? 'bg-warning/10' : 'bg-destructive/10'
                    }`}>
                      <Trophy className={`h-5 w-5 ${pct >= 0.8 ? 'text-accent' : pct >= 0.5 ? 'text-warning' : 'text-destructive'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{result.title}</p>
                      <p className="text-xs text-muted-foreground">{result.course} · {result.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{result.score}<span className="text-sm text-muted-foreground">/{result.total}</span></span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Upcoming Quizzes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-warning" />
              {t('student.upcomingQuizzes')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingQuizzes.map((quiz, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">{quiz.course} · {quiz.questions} {t('quiz.questions')}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-medium">{quiz.dueDate}</p>
                  <Link to="/quizzes">
                    <Button size="sm" variant="ghost" className="gap-1 h-7 mt-0.5 text-xs">
                      <Play className="h-3 w-3" /> {t('student.takeQuiz')}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Exam Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              {t('student.examSchedule')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {examSchedule.map((exam, i) => (
              <div key={i} className="p-3.5 rounded-lg bg-muted/30 border border-border/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{exam.course} — {exam.type}</Badge>
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] h-5">
                    {exam.daysLeft} {t('student.daysLeftSuffix')}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{exam.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{exam.time}</span>
                  <span className="text-xs">{t('student.room')} {exam.room}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
