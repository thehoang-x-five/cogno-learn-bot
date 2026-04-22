import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/shared/StatCard';
import { courseService } from '@/services/courseService';
import { dashboardMeService, type MyDashboardStats } from '@/services/dashboardMeService';
import { quizService } from '@/services/quizService';
import { parseBackendDate } from '@/utils/dateUtils';
import type { Course } from '@/types/course';
import type { Quiz, QuizAttemptResult, ExamSchedule } from '@/types/quiz';
import {
  BookOpen, MessageSquare, ClipboardList, Star, ArrowRight,
  Sparkles, Flame, Calendar, Clock,
} from 'lucide-react';

function formatLocalDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Consecutive days with at least one completed quiz; current allows starting from yesterday if today empty */
function computeStreakFromAttempts(attempts: QuizAttemptResult[]): { current: number; best: number } {
  const dayKeys = new Set<string>();
  for (const a of attempts) {
    const raw = a.completed_at || a.created_at;
    if (!raw) continue;
    const d = parseBackendDate(raw);
    if (Number.isNaN(d.getTime())) continue;
    dayKeys.add(formatLocalDayKey(d));
  }
  if (dayKeys.size === 0) return { current: 0, best: 0 };

  const sortedAsc = [...dayKeys].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i - 1] + 'T12:00:00');
    const curr = new Date(sortedAsc[i] + 'T12:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  let current = 0;
  const check = new Date();
  for (let i = 0; i < 400; i++) {
    const key = formatLocalDayKey(check);
    if (dayKeys.has(key)) {
      current++;
      check.setDate(check.getDate() - 1);
    } else {
      if (current === 0 && i === 0) {
        check.setDate(check.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return { current, best };
}

export default function StudentDashboard() {
  const { t, language } = useLanguage();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const [courses, setCourses] = useState<Course[]>([]);
  const [myStats, setMyStats] = useState<MyDashboardStats | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptResult[]>([]);
  const [quizTitleById, setQuizTitleById] = useState<Record<number, string>>({});
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<{ quiz: Quiz; courseName: string }[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<(ExamSchedule & { courseName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [coursesRes, stats, attemptsRes] = await Promise.all([
          courseService.getMyCourses(0, 20),
          dashboardMeService.getMyStats(),
          quizService.getMyAttempts(),
        ]);
        if (cancelled) return;
        setCourses(coursesRes.items);
        setMyStats(stats);
        const att = attemptsRes.items ?? [];
        setAttempts(att);

        const courseItems = coursesRes.items;
        const courseIds = courseItems.map((c) => c.id);
        if (courseIds.length === 0) {
          setQuizTitleById({});
          setUpcomingQuizzes([]);
          setUpcomingExams([]);
          return;
        }

        const quizLists = await Promise.all(courseIds.map((id) => quizService.list(id)));
        const examLists = await Promise.all(courseIds.map((id) => quizService.getExamSchedules(id)));
        if (cancelled) return;

        const titleMap: Record<number, string> = {};
        quizLists.forEach((res) => {
          res.items.forEach((q) => {
            titleMap[q.id] = q.title;
          });
        });
        setQuizTitleById(titleMap);

        const completedQuizIds = new Set(att.map((a) => a.quiz_id));
        const upcoming: { quiz: Quiz; courseName: string }[] = [];
        courseItems.forEach((course, idx) => {
          for (const q of quizLists[idx].items) {
            if (!completedQuizIds.has(q.id)) {
              upcoming.push({ quiz: q, courseName: course.name });
            }
          }
        });
        upcoming.sort((a, b) => a.quiz.title.localeCompare(b.quiz.title));
        setUpcomingQuizzes(upcoming.slice(0, 8));

        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const examsMerged: (ExamSchedule & { courseName: string })[] = [];
        courseItems.forEach((course, idx) => {
          for (const s of examLists[idx].items) {
            examsMerged.push({ ...s, courseName: course.name });
          }
        });
        const future = examsMerged
          .filter((s) => {
            const d = parseBackendDate(s.exam_date);
            return !Number.isNaN(d.getTime()) && d >= startToday;
          })
          .sort((a, b) => parseBackendDate(a.exam_date).getTime() - parseBackendDate(b.exam_date).getTime());
        setUpcomingExams(future.slice(0, 8));
      } catch (e) {
        console.error('Student dashboard load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const streak = useMemo(() => computeStreakFromAttempts(attempts), [attempts]);

  const fmt = (n: number) => n.toLocaleString(locale);
  const avgScore =
    myStats?.quiz_avg_score != null ? myStats.quiz_avg_score.toFixed(1) : '—';

  const stats = [
    {
      name: t('student.courses'),
      value: loading ? '…' : fmt(myStats?.courses_count ?? 0),
      icon: BookOpen,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      name: t('student.questionsAsked'),
      value: loading ? '…' : fmt(myStats?.user_messages_count ?? 0),
      icon: MessageSquare,
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
    },
    {
      name: t('student.quizCompleted'),
      value: loading ? '…' : fmt(myStats?.quizzes_count ?? 0),
      icon: ClipboardList,
      iconColor: 'text-warning',
      iconBg: 'bg-warning/10',
    },
    {
      name: t('student.avgScore'),
      value: loading ? '…' : avgScore,
      icon: Star,
      iconColor: 'text-info',
      iconBg: 'bg-info/10',
    },
  ];

  const recentAttempts = [...attempts]
    .sort((a, b) => {
      const ta = parseBackendDate(a.completed_at || a.created_at).getTime();
      const tb = parseBackendDate(b.completed_at || b.created_at).getTime();
      return tb - ta;
    })
    .slice(0, 5);

  const typeLabels: Record<string, string> = {
    midterm: 'Giữa kỳ',
    final: 'Cuối kỳ',
    quiz: 'Kiểm tra',
    practical: 'Thực hành',
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
        {stats.map((stat) => (
          <StatCard
            key={stat.name}
            title={stat.name}
            value={stat.value}
            icon={stat.icon}
            iconColor={stat.iconColor}
            iconBg={stat.iconBg}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-warning/5 via-transparent to-warning/5 border-warning/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0">
              <Flame className="h-7 w-7 text-warning" />
            </div>
            <div>
              <p className="text-3xl font-bold">
                {streak.current}{' '}
                <span className="text-base font-medium text-muted-foreground">{t('student.days')}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {t('student.studyStreak')} · {t('student.streakRecord')}: {streak.best}
              </p>
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
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('common.loading')}</p>
            ) : courses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('student.noCourses')}</p>
            ) : (
              courses.slice(0, 5).map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-all group"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="font-medium text-sm truncate">{course.name}</p>
                      <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                        {course.code}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('courseDetail.documents')}: {course.document_count}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('student.recentResults')}</CardTitle>
            <CardDescription className="mt-0.5">{t('student.recentResultsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
            ) : recentAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('student.noQuizData')}</p>
            ) : (
              <ul className="space-y-3">
                {recentAttempts.map((a) => {
                  const pct =
                    a.score_pct ??
                    (a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0);
                  const title = quizTitleById[a.quiz_id] ?? `Quiz #${a.quiz_id}`;
                  const when = a.completed_at || a.created_at;
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{title}</p>
                        <p className="text-xs text-muted-foreground">
                          {when
                            ? parseBackendDate(when).toLocaleString(locale, {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {a.score}/{a.total_questions} ({pct}%)
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('student.upcomingQuizzes')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
            ) : upcomingQuizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('student.noQuizData')}</p>
            ) : (
              <ul className="space-y-2">
                {upcomingQuizzes.map(({ quiz, courseName }) => (
                  <li
                    key={quiz.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{courseName}</p>
                    </div>
                    <Link to={`/quizzes?start=${quiz.id}`}>
                      <Button size="sm" variant="secondary">
                        {t('student.takeQuiz')}
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              {t('student.examSchedule')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
            ) : upcomingExams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                {t('student.noExamData')}
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingExams.map((s) => {
                  const examDate = parseBackendDate(s.exam_date);
                  const label = typeLabels[s.exam_type] ?? s.exam_type;
                  return (
                    <li key={s.id} className="p-3 rounded-lg border bg-muted/30 text-sm space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline">{label}</Badge>
                        <span className="text-xs text-muted-foreground">{s.courseName}</span>
                      </div>
                      <p className="font-medium">
                        {examDate.toLocaleDateString(locale, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {examDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} ·{' '}
                        {s.duration_minutes} phút
                        {s.location ? ` · ${s.location}` : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
