import { useState, useEffect, useRef } from 'react';
import { parseBackendDate } from '@/utils/dateUtils';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { quizService } from '@/services/quizService';
import { courseService } from '@/services/courseService';
import type { Quiz, QuizDetail, QuizAttemptResult, CourseQuizStats } from '@/types/quiz';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList, Search, Plus, Play, Trophy, Clock, Sparkles,
  BookOpen, CheckCircle2, XCircle, ArrowRight, History, BarChart3,
  MoreVertical, Trash2, Loader2, Filter, ChevronDown, ChevronRight, User2,
  FileDown,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import CreateQuizDialog from '@/components/quiz/CreateQuizDialog';
import QuizResultSummary from '@/components/quiz/QuizResultSummary';
import { useToast } from '@/hooks/use-toast';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';

// ─── Query keys ──────────────────────────────────────────

const quizKeys = {
  list: (courseId?: number) => ['quizzes', 'list', courseId] as const,
  detail: (id: number) => ['quizzes', 'detail', id] as const,
  myAttempts: (courseId?: number) => ['quizzes', 'my-attempts', courseId] as const,
  stats: (courseId: number) => ['quizzes', 'stats', courseId] as const,
};

export default function QuizzesPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── State ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourseId, setFilterCourseId] = useState<number | undefined>(undefined);
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // ── Teacher: expand quiz row to see per-student attempts ──
  const [expandedQuizId, setExpandedQuizId] = useState<number | null>(null);
  const [quizAttemptsMap, setQuizAttemptsMap] = useState<Record<number, QuizAttemptResult[] | 'loading'>>({});
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const handleExportMyHistory = async () => {
    setExportingKey('history');
    try {
      await quizService.exportMyAttempts(filterCourseId);
      toast({ title: 'Đã tải xuống', description: 'File Excel lịch sử làm bài.' });
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể xuất Excel.', variant: 'destructive' });
    } finally {
      setExportingKey(null);
    }
  };

  const handleExportCourseStats = async () => {
    if (!filterCourseId) return;
    setExportingKey('course');
    try {
      await quizService.exportCourseStats(filterCourseId);
      toast({ title: 'Đã tải xuống', description: 'File Excel tổng hợp môn học.' });
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể xuất Excel.', variant: 'destructive' });
    } finally {
      setExportingKey(null);
    }
  };

  const handleExportQuizAttempts = async (quizId: number) => {
    setExportingKey(`quiz-${quizId}`);
    try {
      await quizService.exportQuizAttempts(quizId);
      toast({ title: 'Đã tải xuống', description: 'File Excel kết quả quiz.' });
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể xuất Excel.', variant: 'destructive' });
    } finally {
      setExportingKey(null);
    }
  };

  const toggleQuizExpand = async (quizId: number) => {
    if (expandedQuizId === quizId) {
      setExpandedQuizId(null);
      return;
    }
    setExpandedQuizId(quizId);
    if (quizAttemptsMap[quizId] !== undefined) return;
    setQuizAttemptsMap(prev => ({ ...prev, [quizId]: 'loading' }));
    try {
      const res = await quizService.getAttemptsByQuiz(quizId);
      setQuizAttemptsMap(prev => ({ ...prev, [quizId]: res.items }));
    } catch {
      setQuizAttemptsMap(prev => ({ ...prev, [quizId]: [] }));
    }
  };

  // ── Read URL params: ?start=<quiz_id> or ?course_id=<id> ──
  useEffect(() => {
    const startId = searchParams.get('start');
    if (startId) {
      const id = parseInt(startId, 10);
      if (!isNaN(id)) {
        handleStartQuiz(id);
        // Clean URL param after reading
        setSearchParams({}, { replace: true });
      }
    }
    const courseParam = searchParams.get('course_id');
    if (courseParam) {
      const cid = parseInt(courseParam, 10);
      if (!isNaN(cid)) {
        setFilterCourseId(cid);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch courses for filter ──────────────────────────
  const { data: coursesData } = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const data = await courseService.getMyCourses();
      return data.items;
    },
  });
  const courses = coursesData || [];

  // ── Fetch quizzes ─────────────────────────────────────
  const {
    data: quizzesData,
    isLoading: quizzesLoading,
    isError: quizzesError,
    error: quizzesErrorObj,
  } = useQuery({
    queryKey: quizKeys.list(filterCourseId),
    queryFn: async () => {
      try {
        const result = await quizService.list(filterCourseId);
        return result;
      } catch (err: unknown) {
        throw err;
      }
    },
  });
  const quizzes: Quiz[] = quizzesData?.items || [];

  // ── Fetch active quiz detail (when starting) ──────────
  const {
    data: activeQuizDetail,
    isLoading: quizDetailLoading,
  } = useQuery({
    queryKey: quizKeys.detail(activeQuizId!),
    queryFn: () => quizService.getById(activeQuizId!),
    enabled: !!activeQuizId,
  });

  // ── Fetch my attempts ─────────────────────────────────
  const { data: attemptsData } = useQuery({
    queryKey: quizKeys.myAttempts(filterCourseId),
    queryFn: () => quizService.getMyAttempts(filterCourseId),
  });
  const myAttempts: QuizAttemptResult[] = attemptsData?.items || [];

  // ── Fetch teacher stats ───────────────────────────────
  const { data: statsData } = useQuery({
    queryKey: quizKeys.stats(filterCourseId!),
    queryFn: () => quizService.getCourseStats(filterCourseId!),
    enabled: isTeacher && !!filterCourseId,
  });
  const stats: CourseQuizStats | undefined = statsData;

  // ── Delete mutation ───────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => quizService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.list(filterCourseId) });
      toast({ title: 'Đã xóa', description: `Quiz "${deleteTarget?.title}" đã được xóa.` });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: 'Lỗi', description: 'Không thể xóa quiz.', variant: 'destructive' });
    },
  });

  // ── Submit attempt mutation ────────────────────────────
  const submitMutation = useMutation({
    mutationFn: ({ quizId, payload }: { quizId: number; payload: Parameters<typeof quizService.submitAttempt>[1] }) =>
      quizService.submitAttempt(quizId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.myAttempts(filterCourseId) });
      if (filterCourseId) queryClient.invalidateQueries({ queryKey: quizKeys.stats(filterCourseId) });
    },
  });

  // ── Filtered quiz list ────────────────────────────────
  const filteredQuizzes = quizzes.filter((q) =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Quiz player handlers ──────────────────────────────
  const handleStartQuiz = (quizId: number) => {
    setActiveQuizId(quizId);
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setShowResult(false);
    setScore(0);
    setAnswers({});
    setShowSummary(false);
    startTimeRef.current = Date.now();
  };

  const handleAnswer = () => {
    if (!activeQuizDetail) return;
    const q = activeQuizDetail.questions[currentQuestion];
    const isCorrect = selectedAnswer.toUpperCase() === q.correct_answer.toUpperCase();
    const newAnswers = { ...answers, [String(currentQuestion)]: selectedAnswer };
    setAnswers(newAnswers);
    if (isCorrect) setScore((prev) => prev + 1);
    setShowResult(true);
  };

  const handleNext = () => {
    if (!activeQuizDetail) return;
    if (currentQuestion < activeQuizDetail.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer('');
      setShowResult(false);
    } else {
      // Quiz finished — submit attempt
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      submitMutation.mutate({
        quizId: activeQuizId!,
        payload: {
          answers,
          time_spent_seconds: timeSpent,
          started_at: new Date(startTimeRef.current).toISOString(),
        },
      });
      setShowSummary(true);
    }
  };

  // ── Helpers ───────────────────────────────────────────
  const getCourseName = (courseId: number) => {
    const c = courses.find((c) => c.id === courseId);
    return c ? c.name : `Môn ${courseId}`;
  };

  // ═══════════════════════════════════════
  // RENDER: Quiz Result Summary
  // ═══════════════════════════════════════
  if (showSummary && activeQuizId && activeQuizDetail) {
    const summaryAnswers = activeQuizDetail.questions.map((q, idx) => {
      const sel = answers[String(idx)] || '';
      const opts = q.options;
      return {
        questionText: q.question,
        selected: sel ? `${sel}. ${opts[sel as keyof typeof opts] || ''}` : '(Không trả lời)',
        correct: `${q.correct_answer}. ${opts[q.correct_answer]}`,
        isCorrect: sel.toUpperCase() === q.correct_answer.toUpperCase(),
        explanation: q.explanation || '',
      };
    });

    return (
      <QuizResultSummary
        quizTitle={activeQuizDetail.title}
        score={score}
        totalQuestions={activeQuizDetail.questions.length}
        timeSpent={Math.floor((Date.now() - startTimeRef.current) / 1000)}
        answers={summaryAnswers}
        onRetry={() => handleStartQuiz(activeQuizId)}
        onClose={() => { setActiveQuizId(null); setShowSummary(false); }}
      />
    );
  }

  // ═══════════════════════════════════════
  // RENDER: Quiz Player
  // ═══════════════════════════════════════
  if (activeQuizId) {
    if (quizDetailLoading || !activeQuizDetail) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    const questions = activeQuizDetail.questions;
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground truncate max-w-xs">{activeQuizDetail.title}</p>
              <Badge variant="outline">Câu {currentQuestion + 1}/{questions.length}</Badge>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 mr-4">
                <Progress value={progress} className="h-2" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <Trophy className="h-4 w-4 text-warning" />
                {score}/{currentQuestion + (showResult ? 1 : 0)}
              </div>
            </div>
            <CardTitle className="text-xl leading-relaxed">{question.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              disabled={showResult}
              className="space-y-3"
            >
              {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                const text = question.options[opt];
                if (!text) return null;
                const isCorrect = opt === question.correct_answer;
                const isSelected = selectedAnswer === opt;
                return (
                  <div
                    key={opt}
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                      showResult
                        ? isCorrect
                          ? 'bg-success/10 border-success'
                          : isSelected
                          ? 'bg-destructive/10 border-destructive'
                          : 'border-border'
                        : isSelected
                        ? 'bg-primary/5 border-primary'
                        : 'border-border hover:bg-secondary/50'
                    }`}
                  >
                    <RadioGroupItem value={opt} id={`opt-${opt}`} />
                    <Label htmlFor={`opt-${opt}`} className="flex-1 cursor-pointer">
                      <span className="font-medium mr-2">{opt}.</span>
                      {text}
                    </Label>
                    {showResult && isCorrect && <CheckCircle2 className="h-5 w-5 text-success" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive" />}
                  </div>
                );
              })}
            </RadioGroup>

            {showResult && question.explanation && (
              <div className="p-4 rounded-lg bg-info/10 border border-info/20 mt-4">
                <p className="text-sm font-medium text-info mb-1">💡 Giải thích:</p>
                <p className="text-sm text-foreground">{question.explanation}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setActiveQuizId(null)}>Thoát</Button>
              {!showResult ? (
                <Button onClick={handleAnswer} disabled={!selectedAnswer}>Trả lời</Button>
              ) : (
                <Button onClick={handleNext} className="gap-2">
                  {currentQuestion < questions.length - 1
                    ? (<>Tiếp theo <ArrowRight className="h-4 w-4" /></>)
                    : 'Xem kết quả'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // RENDER: Main Quizzes Page
  // ═══════════════════════════════════════
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 page-enter">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Quiz</h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher ? 'Quản lý và tạo câu hỏi trắc nghiệm cho sinh viên' : 'Ôn luyện kiến thức qua các bài trắc nghiệm'}
          </p>
        </div>
        {isTeacher && (
          <Button variant="gradient" className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Tạo Quiz mới
          </Button>
        )}
      </div>

      <Tabs defaultValue="quizzes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quizzes" className="gap-2">
            <ClipboardList className="h-4 w-4" />Danh sách
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />Lịch sử
          </TabsTrigger>
          {isTeacher && (
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />Thống kê
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Tab: Quiz List ── */}
        <TabsContent value="quizzes" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm quiz..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={filterCourseId?.toString() || 'all'}
                onValueChange={(v) => setFilterCourseId(v === 'all' ? undefined : parseInt(v))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tất cả môn học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả môn học</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quiz Grid */}
          {quizzesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : quizzesError ? (
            <div className="text-center py-12 text-destructive">Không thể tải danh sách quiz.</div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có quiz nào{filterCourseId ? ' cho môn này' : ''}.</p>
              {isTeacher && (
                <Button variant="outline" className="mt-4 gap-2" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4" />Tạo quiz đầu tiên
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredQuizzes.map((quiz) => (
                <Card key={quiz.id} className="hover-lift group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                          <ClipboardList className="h-6 w-6 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {quiz.is_ai_generated && (
                            <Badge variant="secondary" className="gap-1 mb-1">
                              <Sparkles className="h-3 w-3" />AI
                            </Badge>
                          )}
                          <CardTitle className="text-base leading-tight">{quiz.title}</CardTitle>
                        </div>
                      </div>
                      {isTeacher && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(quiz)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        <span className="truncate max-w-[120px]">{getCourseName(quiz.course_id).split(' - ')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClipboardList className="h-4 w-4" />
                        {quiz.question_count} câu
                      </div>
                    </div>
                    <Button className="w-full gap-2" onClick={() => handleStartQuiz(quiz.id)}>
                      <Play className="h-4 w-4" />
                      {isTeacher ? 'Xem trước' : 'Bắt đầu'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: History ── */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
              <div>
                <CardTitle>Lịch sử làm bài</CardTitle>
                <CardDescription>Tất cả các lần bạn đã làm quiz</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                disabled={myAttempts.length === 0 || exportingKey === 'history'}
                onClick={handleExportMyHistory}
              >
                {exportingKey === 'history' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                Xuất Excel
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {myAttempts.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Chưa có lịch sử làm bài.</p>
              ) : (
                myAttempts.map((attempt) => {
                  const pct = attempt.total_questions > 0
                    ? Math.round((attempt.score / attempt.total_questions) * 100)
                    : 0;
                  const minutes = attempt.time_spent_seconds
                    ? Math.floor(attempt.time_spent_seconds / 60)
                    : 0;
                  const quizInfo = quizzes.find((q) => q.id === attempt.quiz_id);
                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          pct >= 80 ? 'bg-accent/10' : pct >= 50 ? 'bg-warning/10' : 'bg-destructive/10'
                        }`}>
                          <Trophy className={`h-6 w-6 ${pct >= 80 ? 'text-accent' : pct >= 50 ? 'text-warning' : 'text-destructive'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{quizInfo?.title || `Quiz #${attempt.quiz_id}`}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {minutes > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />{minutes} phút
                              </span>
                            )}
                            {attempt.completed_at && (
                              <span>
                                {parseBackendDate(attempt.completed_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{attempt.score}/{attempt.total_questions}</p>
                        <Badge
                          variant="outline"
                          className={pct >= 80 ? 'status-ready' : pct >= 50 ? 'status-processing' : 'status-error'}
                        >
                          {pct}%
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Stats (Teacher only) ── */}
        {isTeacher && (
          <TabsContent value="stats" className="space-y-6">
            {/* Course filter required for stats */}
            {!filterCourseId ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Chọn môn học ở bộ lọc bên trên để xem thống kê.</p>
                </CardContent>
              </Card>
            ) : !stats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={exportingKey === 'course'}
                    onClick={handleExportCourseStats}
                  >
                    {exportingKey === 'course' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4" />
                    )}
                    Xuất tổng hợp
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2"><CardDescription>Tổng số quiz</CardDescription></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.total_quizzes}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardDescription>Lượt làm bài</CardDescription></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.total_attempts}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardDescription>Điểm trung bình</CardDescription></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-accent">{stats.average_score_pct}%</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardDescription>AI tạo</CardDescription></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {quizzes.filter((q) => q.is_ai_generated && q.course_id === filterCourseId).length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Kết quả theo Quiz</CardTitle>
                    <CardDescription>Click vào một quiz để xem chi tiết từng sinh viên</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.quizzes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu.</p>
                    ) : (
                      stats.quizzes.map((q) => {
                        const isExpanded = expandedQuizId === q.id;
                        const attempts = quizAttemptsMap[q.id];
                        return (
                          <div key={q.id} className="rounded-lg border bg-muted/30 overflow-hidden">
                            {/* Quiz row — clickable */}
                            <button
                              type="button"
                              className="w-full flex items-center justify-between p-4 hover:bg-muted/60 transition-colors text-left"
                              onClick={() => toggleQuizExpand(q.id)}
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded
                                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                }
                                <div>
                                  <p className="font-medium text-sm">{q.title}</p>
                                  <p className="text-xs text-muted-foreground">{q.question_count} câu hỏi</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 text-sm shrink-0">
                                <div className="text-center">
                                  <p className="font-bold">{q.attempt_count}</p>
                                  <p className="text-xs text-muted-foreground">Lượt làm</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-bold text-accent">{q.average_score_pct}%</p>
                                  <p className="text-xs text-muted-foreground">Điểm TB</p>
                                </div>
                              </div>
                            </button>

                            {/* Expanded: per-student attempts table */}
                            {isExpanded && (
                              <div className="border-t bg-background px-4 py-3">
                                {attempts !== 'loading' && attempts && (
                                  <div className="flex justify-end mb-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      disabled={exportingKey === `quiz-${q.id}`}
                                      onClick={() => handleExportQuizAttempts(q.id)}
                                    >
                                      {exportingKey === `quiz-${q.id}` ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <FileDown className="h-4 w-4" />
                                      )}
                                      Xuất Quiz này
                                    </Button>
                                  </div>
                                )}
                                {attempts === 'loading' ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                                    <span className="text-sm text-muted-foreground">Đang tải...</span>
                                  </div>
                                ) : !attempts || attempts.length === 0 ? (
                                  <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                                    <User2 className="h-4 w-4" />
                                    <span className="text-sm">Chưa có sinh viên nào làm bài này.</span>
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b text-xs text-muted-foreground">
                                          <th className="text-left py-2 pr-4 font-medium">STT</th>
                                          <th className="text-left py-2 pr-4 font-medium">Sinh viên</th>
                                          <th className="text-center py-2 pr-4 font-medium">Điểm</th>
                                          <th className="text-center py-2 pr-4 font-medium">Phần trăm</th>
                                          <th className="text-center py-2 pr-4 font-medium">Thời gian</th>
                                          <th className="text-right py-2 font-medium">Ngày làm</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {attempts.map((a, idx) => {
                                          const pct = a.score_pct ?? (a.total_questions > 0 ? Math.round(a.score / a.total_questions * 100) : 0);
                                          const mins = a.time_spent_seconds ? Math.floor(a.time_spent_seconds / 60) : null;
                                          const secs = a.time_spent_seconds ? a.time_spent_seconds % 60 : null;
                                          const doneAt = parseBackendDate(a.completed_at || a.created_at);
                                          return (
                                            <tr key={a.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                                              <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                                              <td className="py-2 pr-4 font-medium">
                                                {a.user_name || `User #${a.user_id}`}
                                              </td>
                                              <td className="py-2 pr-4 text-center">
                                                <span className="font-bold">{a.score}</span>
                                                <span className="text-muted-foreground">/{a.total_questions}</span>
                                              </td>
                                              <td className="py-2 pr-4 text-center">
                                                <Badge
                                                  variant="outline"
                                                  className={
                                                    pct >= 80 ? 'bg-accent/10 text-accent border-accent/30'
                                                    : pct >= 50 ? 'bg-warning/10 text-warning border-warning/30'
                                                    : 'bg-destructive/10 text-destructive border-destructive/30'
                                                  }
                                                >
                                                  {pct}%
                                                </Badge>
                                              </td>
                                              <td className="py-2 pr-4 text-center text-muted-foreground">
                                                {mins !== null ? `${mins}p ${secs}s` : '—'}
                                              </td>
                                              <td className="py-2 text-right text-muted-foreground text-xs">
                                                {doneAt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* ── Dialogs ── */}
      <CreateQuizDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        courses={courses}
        onQuizCreated={(newQuiz) => {
          queryClient.invalidateQueries({ queryKey: quizKeys.list(filterCourseId) });
          toast({ title: 'Đã tạo Quiz', description: `Quiz "${newQuiz.title}" đã được tạo thành công.` });
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa Quiz"
        description={`Bạn có chắc chắn muốn xóa quiz "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
