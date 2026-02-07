import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Quiz, QuizQuestion } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList,
  Search,
  Plus,
  Play,
  Trophy,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Mock quizzes
const mockQuizzes: Quiz[] = [
  { id: '1', courseId: '3', createdBy: '2', title: 'Ôn tập Chương 1 - Giới thiệu OOP', chapter: 'Chương 1', isAiGenerated: true, questionCount: 10, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', courseId: '3', createdBy: '2', title: 'Kiểm tra 4 tính chất OOP', chapter: 'Chương 2', isAiGenerated: true, questionCount: 5, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', courseId: '1', createdBy: '2', title: 'Python cơ bản - Vòng lặp', chapter: 'Chương 3', isAiGenerated: false, questionCount: 8, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: '4', courseId: '2', createdBy: '2', title: 'Thuật toán sắp xếp', chapter: 'Chương 4', isAiGenerated: true, questionCount: 12, createdAt: new Date(Date.now() - 345600000).toISOString() },
];

// Mock quiz questions for demo
const mockQuestions: QuizQuestion[] = [
  {
    id: '1',
    quizId: '1',
    questionText: 'OOP có bao nhiêu tính chất chính?',
    optionA: '2 tính chất',
    optionB: '3 tính chất',
    optionC: '4 tính chất',
    optionD: '5 tính chất',
    correctAnswer: 'C',
    explanation: '4 tính chất chính của OOP: Đóng gói (Encapsulation), Kế thừa (Inheritance), Đa hình (Polymorphism), Trừu tượng (Abstraction).',
    difficulty: 'easy',
  },
  {
    id: '2',
    quizId: '1',
    questionText: 'Tính chất nào cho phép class con sử dụng lại code từ class cha?',
    optionA: 'Đóng gói',
    optionB: 'Kế thừa',
    optionC: 'Đa hình',
    optionD: 'Trừu tượng',
    correctAnswer: 'B',
    explanation: 'Kế thừa (Inheritance) cho phép class con kế thừa thuộc tính và phương thức từ class cha, giúp tái sử dụng code hiệu quả.',
    difficulty: 'easy',
  },
  {
    id: '3',
    quizId: '1',
    questionText: 'Từ khóa nào dùng để khai báo class trong Java?',
    optionA: 'define',
    optionB: 'struct',
    optionC: 'class',
    optionD: 'object',
    correctAnswer: 'C',
    explanation: 'Trong Java, từ khóa "class" được sử dụng để khai báo một class mới.',
    difficulty: 'easy',
  },
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
      // Quiz completed
      setActiveQuiz(null);
    }
  };

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
            <CardTitle className="text-xl leading-relaxed">
              {question.questionText}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              disabled={showResult}
              className="space-y-3"
            >
              {(['A', 'B', 'C', 'D'] as const).map((option) => {
                const optionKey = `option${option}` as keyof QuizQuestion;
                const isCorrect = option === question.correctAnswer;
                const isSelected = selectedAnswer === option;

                return (
                  <div
                    key={option}
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
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="flex-1 cursor-pointer">
                      <span className="font-medium mr-2">{option}.</span>
                      {question[optionKey] as string}
                    </Label>
                    {showResult && isCorrect && (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
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
              <Button variant="outline" onClick={() => setActiveQuiz(null)}>
                Thoát
              </Button>
              {!showResult ? (
                <Button onClick={handleAnswer} disabled={!selectedAnswer}>
                  Trả lời
                </Button>
              ) : (
                <Button onClick={handleNext} className="gap-2">
                  {currentQuestion < mockQuestions.length - 1 ? (
                    <>
                      Câu tiếp theo
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    'Hoàn thành'
                  )}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quiz</h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher ? 'Tạo và quản lý bài kiểm tra' : 'Ôn tập và kiểm tra kiến thức'}
          </p>
        </div>
        {isTeacher && (
          <Button variant="gradient" className="gap-2">
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
                Yêu cầu AI tạo câu hỏi ôn tập từ tài liệu môn học. Ví dụ: "Tạo 5 câu ôn tập chương 2"
              </p>
            </div>
            <Button variant="gradient" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Thử ngay
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm quiz..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quizzes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredQuizzes.map((quiz) => {
          const course = courses.find((c) => c.id === quiz.courseId);

          return (
            <Card key={quiz.id} className="hover-lift group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                      <ClipboardList className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      {quiz.isAiGenerated && (
                        <Badge variant="secondary" className="gap-1 mb-1">
                          <Sparkles className="h-3 w-3" />
                          AI Generated
                        </Badge>
                      )}
                      <CardTitle className="text-base leading-tight">{quiz.title}</CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {course?.name.split(' - ')[0]}
                  </div>
                  <div className="flex items-center gap-1">
                    <ClipboardList className="h-4 w-4" />
                    {quiz.questionCount} câu
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleStartQuiz(quiz.id)}
                  >
                    <Play className="h-4 w-4" />
                    Bắt đầu
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredQuizzes.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Không tìm thấy quiz</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {isTeacher ? 'Tạo quiz mới để sinh viên ôn tập' : 'Chưa có quiz nào trong môn học này'}
          </p>
        </div>
      )}
    </div>
  );
}
