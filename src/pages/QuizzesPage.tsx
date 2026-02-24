import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import CreateQuizDialog from '@/components/quiz/CreateQuizDialog';
import QuizResultSummary from '@/components/quiz/QuizResultSummary';

// Mock quizzes
const mockQuizzes: Quiz[] = [
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

  const filteredQuizzes = mockQuizzes.filter((quiz) =>
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
        quizTitle={mockQuizzes.find((q) => q.id === activeQuiz)?.title || ''}
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
              <Badge variant="outline">Câu {currentQuestion + 1}/{mockQuestions.length}</Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4 text-warning" />
                Điểm: {score}/{currentQuestion + (showResult ? 1 : 0)}
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
                <p className="text-sm font-medium text-info mb-1">💡 Giải thích:</p>
                <p className="text-sm text-foreground">{question.explanation}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setActiveQuiz(null)}>Thoát</Button>
              {!showResult ? (
                <Button onClick={handleAnswer} disabled={!selectedAnswer}>Trả lời</Button>
              ) : (
                <Button onClick={handleNext} className="gap-2">
                  {currentQuestion < mockQuestions.length - 1 ? (<>Câu tiếp theo <ArrowRight className="h-4 w-4" /></>) : 'Xem kết quả'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quiz</h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher ? 'Tạo và quản lý bài kiểm tra' : 'Ôn tập và kiểm tra kiến thức'}
          </p>
        </div>
        {isTeacher && (
          <Button variant="gradient" className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Tạo Quiz mới
          </Button>
        )}
      </div>

      {/* AI Quiz Generator Banner */}
      <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center ai-glow">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Tạo Quiz bằng AI</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Yêu cầu AI tạo câu hỏi ôn tập từ tài liệu môn học
              </p>
            </div>
            <Button variant="gradient" className="gap-2" onClick={() => setIsCreateOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Thử ngay
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="quizzes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quizzes" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Danh sách Quiz
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Lịch sử làm bài
          </TabsTrigger>
          {isTeacher && (
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Thống kê
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="quizzes" className="space-y-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm quiz..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuizzes.map((quiz) => {
              const course = courses.find((c) => c.id === quiz.courseId);
              return (
                <Card key={quiz.id} className="hover-lift group">
                  <CardHeader className="pb-3">
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
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{course?.name.split(' - ')[0]}</div>
                      <div className="flex items-center gap-1"><ClipboardList className="h-4 w-4" />{quiz.questionCount} câu</div>
                    </div>
                    <Button className="w-full gap-2" onClick={() => handleStartQuiz(quiz.id)}>
                      <Play className="h-4 w-4" />
                      {isTeacher ? 'Xem trước' : 'Bắt đầu'}
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
              <CardTitle>Lịch sử làm bài</CardTitle>
              <CardDescription>Tất cả các lần làm quiz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAttempts.map((attempt) => {
                const quiz = mockQuizzes.find((q) => q.id === attempt.quizId);
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
                        <p className="font-medium">{quiz?.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{minutes} phút</span>
                          <span>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleDateString('vi-VN') : '—'}</span>
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
              <Card>
                <CardHeader className="pb-2"><CardDescription>Tổng Quiz</CardDescription></CardHeader>
                <CardContent><div className="text-2xl font-bold">{mockQuizzes.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>Tổng lượt làm</CardDescription></CardHeader>
                <CardContent><div className="text-2xl font-bold">{mockAttempts.length * 12}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>Điểm TB toàn hệ thống</CardDescription></CardHeader>
                <CardContent><div className="text-2xl font-bold text-accent">72%</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>Quiz AI đã tạo</CardDescription></CardHeader>
                <CardContent><div className="text-2xl font-bold text-primary">{mockQuizzes.filter(q => q.isAiGenerated).length}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Kết quả theo Quiz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockQuizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground">{quiz.questionCount} câu • {quiz.chapter}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-bold">{Math.floor(Math.random() * 30 + 20)}</p>
                        <p className="text-xs text-muted-foreground">Lượt làm</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-accent">{Math.floor(Math.random() * 30 + 60)}%</p>
                        <p className="text-xs text-muted-foreground">Điểm TB</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <CreateQuizDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
