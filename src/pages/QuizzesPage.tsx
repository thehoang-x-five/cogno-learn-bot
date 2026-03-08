import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Quiz, QuizQuestion, QuizAttempt } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList, Search, Plus, Play, Trophy, Clock, Sparkles,
  BookOpen, CheckCircle2, XCircle, ArrowRight, History, BarChart3,
  MoreVertical, Edit, Trash2, Eye, Copy, Share2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import CreateQuizDialog from '@/components/quiz/CreateQuizDialog';
import QuizResultSummary from '@/components/quiz/QuizResultSummary';
import { useToast } from '@/hooks/use-toast';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import EditDialog, { EditField } from '@/components/shared/EditDialog';

const initialQuizzes: Quiz[] = [
  { id: '1', courseId: '3', createdBy: '2', title: 'Ôn tập Chương 1 - Giới thiệu OOP', chapter: 'Chương 1', isAiGenerated: true, questionCount: 10, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', courseId: '3', createdBy: '2', title: 'Kiểm tra 4 tính chất OOP', chapter: 'Chương 2', isAiGenerated: true, questionCount: 5, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', courseId: '1', createdBy: '2', title: 'Python cơ bản - Vòng lặp', chapter: 'Chương 3', isAiGenerated: false, questionCount: 8, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: '4', courseId: '2', createdBy: '2', title: 'Thuật toán sắp xếp', chapter: 'Chương 4', isAiGenerated: true, questionCount: 12, createdAt: new Date(Date.now() - 345600000).toISOString() },
];

const mockQuestions: QuizQuestion[] = [
  { id: '1', quizId: '1', questionText: 'OOP có bao nhiêu tính chất chính?', optionA: '2 tính chất', optionB: '3 tính chất', optionC: '4 tính chất', optionD: '5 tính chất', correctAnswer: 'C', explanation: '4 tính chất chính của OOP: Đóng gói, Kế thừa, Đa hình, Trừu tượng.', difficulty: 'easy' },
  { id: '2', quizId: '1', questionText: 'Tính chất nào cho phép class con sử dụng lại code từ class cha?', optionA: 'Đóng gói', optionB: 'Kế thừa', optionC: 'Đa hình', optionD: 'Trừu tượng', correctAnswer: 'B', explanation: 'Kế thừa (Inheritance) cho phép class con kế thừa thuộc tính và phương thức từ class cha.', difficulty: 'easy' },
  { id: '3', quizId: '1', questionText: 'Từ khóa nào dùng để khai báo class trong Java?', optionA: 'define', optionB: 'struct', optionC: 'class', optionD: 'object', correctAnswer: 'C', explanation: 'Trong Java, từ khóa "class" được sử dụng để khai báo một class mới.', difficulty: 'easy' },
];

const mockAttempts: QuizAttempt[] = [
  { id: '1', quizId: '1', userId: '3', score: 8, totalQuestions: 10, timeSpentSeconds: 320, startedAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 86100000).toISOString() },
  { id: '2', quizId: '2', userId: '3', score: 4, totalQuestions: 5, timeSpentSeconds: 180, startedAt: new Date(Date.now() - 172800000).toISOString(), completedAt: new Date(Date.now() - 172500000).toISOString() },
  { id: '3', quizId: '3', userId: '3', score: 6, totalQuestions: 8, timeSpentSeconds: 450, startedAt: new Date(Date.now() - 259200000).toISOString(), completedAt: new Date(Date.now() - 258800000).toISOString() },
];

const courses = [
  { id: '3', name: 'CS301 - Lập trình OOP' },
  { id: '1', name: 'CS101 - Nhập môn lập trình' },
  { id: '2', name: 'CS201 - Cấu trúc dữ liệu' },
];

export default function QuizzesPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [startTime] = useState(Date.now());
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);
  const [editTarget, setEditTarget] = useState<Quiz | null>(null);

  const filteredQuizzes = quizzes.filter((quiz) =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isTeacher = user?.role === 'teacher';

  const handleStartQuiz = (quizId: string) => {
    setActiveQuiz(quizId);
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setShowResult(false);
    setScore(0);
    setAnswers({});
    setShowSummary(false);
  };

  const handleAnswer = () => {
    const question = mockQuestions[currentQuestion];
    const isCorrect = selectedAnswer === question.correctAnswer;
    setAnswers((prev) => ({ ...prev, [question.id]: selectedAnswer }));
    if (isCorrect) setScore((prev) => prev + 1);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer('');
      setShowResult(false);
    } else {
      setShowSummary(true);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setQuizzes((prev) => prev.filter((q) => q.id !== deleteTarget.id));
    toast({ title: t('toast.deleted'), description: `Quiz "${deleteTarget.title}" ${t('toast.quizDeleted')}` });
    setDeleteTarget(null);
  };

  const handleDuplicate = (quiz: Quiz) => {
    const newQuiz: Quiz = { ...quiz, id: Date.now().toString(), title: `${quiz.title} (${t('quiz.copy')})`, createdAt: new Date().toISOString() };
    setQuizzes((prev) => [...prev, newQuiz]);
    toast({ title: t('toast.duplicated'), description: `Quiz "${quiz.title}" ${t('toast.quizDuplicated')}` });
  };

  const handleShare = (quiz: Quiz) => {
    const url = `${window.location.origin}/quizzes/${quiz.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: t('toast.linkCopied'), description: t('toast.quizLinkCopied') });
  };

  const handleEditSave = (values: Record<string, string>) => {
    if (!editTarget) return;
    setQuizzes((prev) => prev.map((q) =>
      q.id === editTarget.id ? { ...q, title: values.title, chapter: values.chapter } : q
    ));
    toast({ title: t('toast.updated'), description: `Quiz "${values.title}" ${t('toast.quizUpdated')}` });
    setEditTarget(null);
  };

  const editFields: EditField[] = editTarget ? [
    { key: 'title', label: t('quiz.quizName'), value: editTarget.title },
    { key: 'chapter', label: t('quiz.chapter'), value: editTarget.chapter || '' },
  ] : [];

  // Show summary
  if (showSummary && activeQuiz) {
    const summaryAnswers = mockQuestions.map((q) => {
      const sel = answers[q.id] || selectedAnswer;
      const optionMap: Record<string, string> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
      return {
        questionText: q.questionText,
        selected: `${sel}. ${optionMap[sel] || ''}`,
        correct: `${q.correctAnswer}. ${optionMap[q.correctAnswer]}`,
        isCorrect: sel === q.correctAnswer,
        explanation: q.explanation,
      };
    });

    return (
      <QuizResultSummary
        quizTitle={quizzes.find((q) => q.id === activeQuiz)?.title || ''}
        score={score + (selectedAnswer === mockQuestions[currentQuestion]?.correctAnswer ? 1 : 0)}
        totalQuestions={mockQuestions.length}
        timeSpent={Math.floor((Date.now() - startTime) / 1000)}
        answers={summaryAnswers}
        onRetry={() => handleStartQuiz(activeQuiz)}
        onClose={() => { setActiveQuiz(null); setShowSummary(false); }}
      />
    );
  }

  // Quiz player
  if (activeQuiz) {
    const question = mockQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / mockQuestions.length) * 100;

    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline">{t('quiz.questionNum')} {currentQuestion + 1}/{mockQuestions.length}</Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4 text-warning" />
                {t('quiz.score')}: {score}/{currentQuestion + (showResult ? 1 : 0)}
              </div>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            <CardTitle className="text-xl leading-relaxed">{question.questionText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={showResult} className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map((option) => {
                const optionKey = `option${option}` as keyof QuizQuestion;
                const isCorrect = option === question.correctAnswer;
                const isSelected = selectedAnswer === option;
                return (
                  <div key={option} className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                    showResult ? (isCorrect ? 'bg-success/10 border-success' : isSelected ? 'bg-destructive/10 border-destructive' : 'border-border')
                    : isSelected ? 'bg-primary/5 border-primary' : 'border-border hover:bg-secondary/50'
                  }`}>
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="flex-1 cursor-pointer">
                      <span className="font-medium mr-2">{option}.</span>
                      {question[optionKey] as string}
                    </Label>
                    {showResult && isCorrect && <CheckCircle2 className="h-5 w-5 text-success" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive" />}
                  </div>
                );
              })}
            </RadioGroup>

            {showResult && (
              <div className="p-4 rounded-lg bg-info/10 border border-info/20 mt-4">
                <p className="text-sm font-medium text-info mb-1">💡 {t('quiz.explanation')}:</p>
                <p className="text-sm text-foreground">{question.explanation}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setActiveQuiz(null)}>{t('action.exit')}</Button>
              {!showResult ? (
                <Button onClick={handleAnswer} disabled={!selectedAnswer}>{t('action.answer')}</Button>
              ) : (
                <Button onClick={handleNext} className="gap-2">
                  {currentQuestion < mockQuestions.length - 1 ? (<>{t('action.next')} <ArrowRight className="h-4 w-4" /></>) : t('action.viewResult')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t('quiz.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher ? t('quiz.teacherDesc') : t('quiz.studentDesc')}
          </p>
        </div>
        {isTeacher && (
          <Button variant="gradient" className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('quiz.createNew')}
          </Button>
        )}
      </div>

      <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center ai-glow">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{t('quiz.aiCreate')}</h3>
              <p className="text-muted-foreground text-sm mt-1">{t('quiz.aiDesc')}</p>
            </div>
            <Button variant="gradient" className="gap-2" onClick={() => setIsCreateOpen(true)}>
              <Sparkles className="h-4 w-4" />
              {t('quiz.tryNow')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="quizzes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quizzes" className="gap-2"><ClipboardList className="h-4 w-4" />{t('quiz.list')}</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />{t('quiz.history')}</TabsTrigger>
          {isTeacher && (<TabsTrigger value="stats" className="gap-2"><BarChart3 className="h-4 w-4" />{t('quiz.stats')}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="quizzes" className="space-y-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('quiz.searchQuiz')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuizzes.map((quiz) => {
              const course = courses.find((c) => c.id === quiz.courseId);
              return (
                <Card key={quiz.id} className="hover-lift group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                          <ClipboardList className="h-6 w-6 text-warning" />
                        </div>
                        <div>
                          {quiz.isAiGenerated && (
                            <Badge variant="secondary" className="gap-1 mb-1"><Sparkles className="h-3 w-3" />AI</Badge>
                          )}
                          <CardTitle className="text-base leading-tight">{quiz.title}</CardTitle>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartQuiz(quiz.id)}>
                            <Eye className="mr-2 h-4 w-4" />{t('action.preview')}
                          </DropdownMenuItem>
                          {isTeacher && (
                            <>
                              <DropdownMenuItem onClick={() => setEditTarget(quiz)}>
                                <Edit className="mr-2 h-4 w-4" />{t('action.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(quiz)}>
                                <Copy className="mr-2 h-4 w-4" />{t('action.duplicate')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShare(quiz)}>
                                <Share2 className="mr-2 h-4 w-4" />{t('action.share')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(quiz)}>
                                <Trash2 className="mr-2 h-4 w-4" />{t('action.delete')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{course?.name.split(' - ')[0]}</div>
                      <div className="flex items-center gap-1"><ClipboardList className="h-4 w-4" />{quiz.questionCount} {t('quiz.questions')}</div>
                    </div>
                    <Button className="w-full gap-2" onClick={() => handleStartQuiz(quiz.id)}>
                      <Play className="h-4 w-4" />
                      {isTeacher ? t('action.preview') : t('action.start')}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('quiz.historyTitle')}</CardTitle>
              <CardDescription>{t('quiz.allAttempts')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAttempts.map((attempt) => {
                const quiz = quizzes.find((q) => q.id === attempt.quizId);
                const pct = Math.round((attempt.score / attempt.totalQuestions) * 100);
                const minutes = Math.floor(attempt.timeSpentSeconds / 60);
                return (
                  <div key={attempt.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        pct >= 80 ? 'bg-accent/10' : pct >= 50 ? 'bg-warning/10' : 'bg-destructive/10'
                      }`}>
                        <Trophy className={`h-6 w-6 ${pct >= 80 ? 'text-accent' : pct >= 50 ? 'text-warning' : 'text-destructive'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{quiz?.title || t('quiz.deletedQuiz')}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{minutes} {t('quiz.minutes')}</span>
                          <span>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{attempt.score}/{attempt.totalQuestions}</p>
                      <Badge variant="outline" className={pct >= 80 ? 'status-ready' : pct >= 50 ? 'status-processing' : 'status-error'}>
                        {pct}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {isTeacher && (
          <TabsContent value="stats" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardDescription>{t('quiz.totalQuiz')}</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{quizzes.length}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('quiz.totalAttempts')}</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{mockAttempts.length * 12}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('quiz.systemAvg')}</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold text-accent">72%</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{t('quiz.aiCreated')}</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{quizzes.filter(q => q.isAiGenerated).length}</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>{t('quiz.resultByQuiz')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground">{quiz.questionCount} {t('quiz.questions')} • {quiz.chapter}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-bold">{Math.floor(Math.random() * 30 + 20)}</p>
                        <p className="text-xs text-muted-foreground">{t('quiz.attempts')}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-accent">{Math.floor(Math.random() * 30 + 60)}%</p>
                        <p className="text-xs text-muted-foreground">{t('quiz.avgScore')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <CreateQuizDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onQuizCreated={(data) => {
          const newQuiz: Quiz = {
            id: Date.now().toString(),
            courseId: data.courseId,
            createdBy: user?.id || '2',
            title: data.title,
            chapter: data.chapter,
            isAiGenerated: data.isAiGenerated,
            questionCount: data.questionCount,
            createdAt: new Date().toISOString(),
          };
          setQuizzes(prev => [newQuiz, ...prev]);
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('confirm.deleteQuiz')}
        description={`${t('confirm.sure')} "${deleteTarget?.title}"? ${t('confirm.quizDeleteDesc')}`}
        onConfirm={handleDelete}
      />

      <EditDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title={`${t('action.edit')} quiz`}
        description={t('toast.updated')}
        fields={editFields}
        onSave={handleEditSave}
      />
    </div>
  );
}
