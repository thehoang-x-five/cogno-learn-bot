import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { quizService } from '@/services/quizService';
import type { Course } from '@/types/course';
import type { Quiz } from '@/types/quiz';

interface CreateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  onQuizCreated?: (quiz: Quiz) => void;
}

interface ManualQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

const emptyQuestion: ManualQuestion = {
  question: '',
  options: { A: '', B: '', C: '', D: '' },
  correct_answer: 'A',
  explanation: '',
};

export default function CreateQuizDialog({ open, onOpenChange, courses, onQuizCreated }: CreateQuizDialogProps) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [questions, setQuestions] = useState<ManualQuestion[]>([{ ...emptyQuestion }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const { toast } = useToast();

  const addQuestion = () => setQuestions([...questions, { ...emptyQuestion }]);
  const removeQuestion = (i: number) => setQuestions(questions.filter((_, idx) => idx !== i));

  const updateQuestion = (i: number, field: keyof ManualQuestion, value: string) => {
    const updated = [...questions];
    if (field === 'correct_answer') {
      updated[i] = { ...updated[i], correct_answer: value as 'A' | 'B' | 'C' | 'D' };
    } else {
      updated[i] = { ...updated[i], [field]: value };
    }
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, opt: 'A' | 'B' | 'C' | 'D', value: string) => {
    const updated = [...questions];
    updated[qIdx] = { ...updated[qIdx], options: { ...updated[qIdx].options, [opt]: value } };
    setQuestions(updated);
  };

  const resetForm = () => {
    setTitle('');
    setCourseId('');
    setTopic('');
    setQuestionCount('5');
    setQuestions([{ ...emptyQuestion }]);
    setMode('ai');
    setIsGenerating(false);
    setAiProgress(0);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tiêu đề quiz.', variant: 'destructive' });
      return;
    }
    if (!courseId) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn môn học.', variant: 'destructive' });
      return;
    }

    if (mode === 'ai') {
      setIsGenerating(true);
      setAiProgress(10);

      // Simulate progress while waiting for API
      const progressInterval = setInterval(() => {
        setAiProgress((prev) => {
          if (prev >= 85) return prev;
          return prev + Math.random() * 8 + 3;
        });
      }, 400);

      try {
        const quiz = await quizService.createAI({
          course_id: parseInt(courseId),
          title,
          topic: topic || title,
          num_questions: parseInt(questionCount),
        });

        clearInterval(progressInterval);
        setAiProgress(100);

        setTimeout(() => {
          onQuizCreated?.(quiz);
          resetForm();
          onOpenChange(false);
        }, 600);
      } catch (err: any) {
        clearInterval(progressInterval);
        setIsGenerating(false);
        setAiProgress(0);
        toast({
          title: 'Lỗi tạo quiz AI',
          description: err.detail || err.message || 'Không thể tạo quiz. Vui lòng thử lại.',
          variant: 'destructive',
        });
      }
    } else {
      // Manual mode
      const validQuestions = questions.filter(
        (q) => q.question.trim() && q.options.A.trim() && q.options.B.trim()
      );
      if (validQuestions.length === 0) {
        toast({ title: 'Lỗi', description: 'Vui lòng nhập ít nhất 1 câu hỏi đầy đủ.', variant: 'destructive' });
        return;
      }

      try {
        const quiz = await quizService.createManual({
          course_id: parseInt(courseId),
          title,
          questions: validQuestions.map((q) => ({
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
          })),
        });

        onQuizCreated?.(quiz);
        resetForm();
        onOpenChange(false);
      } catch (err: any) {
        toast({
          title: 'Lỗi tạo quiz',
          description: err.detail || err.message || 'Không thể tạo quiz. Vui lòng thử lại.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isGenerating) { onOpenChange(o); if (!o) resetForm(); }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo Quiz mới</DialogTitle>
          <DialogDescription>Tạo quiz thủ công hoặc sử dụng AI để tự động tạo câu hỏi từ tài liệu</DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="py-12 flex flex-col items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center ai-glow">
              {aiProgress >= 100 ? (
                <CheckCircle2 className="h-8 w-8 text-accent" />
              ) : (
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              )}
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">
                {aiProgress >= 100 ? 'Hoàn tất!' : 'AI đang tạo câu hỏi...'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {aiProgress >= 100
                  ? `${questionCount} câu hỏi đã được tạo thành công`
                  : `Đang phân tích tài liệu và tạo ${questionCount} câu hỏi...`}
              </p>
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Progress value={Math.min(aiProgress, 100)} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">{Math.min(Math.round(aiProgress), 100)}%</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tiêu đề Quiz</Label>
                  <Input
                    placeholder="VD: Ôn tập Chương 2"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Môn học</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn môn học" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs value={mode} onValueChange={(v) => setMode(v as 'ai' | 'manual')}>
                <TabsList className="w-full">
                  <TabsTrigger value="ai" className="flex-1 gap-2">
                    <Sparkles className="h-4 w-4" />Tạo bằng AI
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex-1 gap-2">
                    <Plus className="h-4 w-4" />Tạo thủ công
                  </TabsTrigger>
                </TabsList>

                {/* AI Mode */}
                <TabsContent value="ai" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Chủ đề / Chương</Label>
                      <Input
                        placeholder="VD: Chương 2, lập trình hướng đối tượng"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Số câu hỏi</Label>
                      <Select value={questionCount} onValueChange={setQuestionCount}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n} câu</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary inline mr-2" />
                    AI sẽ tạo câu hỏi từ tài liệu đã upload của môn học được chọn. Đảm bảo đã upload tài liệu trước.
                  </div>
                </TabsContent>

                {/* Manual Mode */}
                <TabsContent value="manual" className="space-y-4 mt-4">
                  {questions.map((q, i) => (
                    <div key={i} className="p-4 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Câu {i + 1}</Badge>
                        {questions.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Câu hỏi</Label>
                        <Textarea
                          placeholder="Nhập câu hỏi..."
                          value={q.question}
                          onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <div key={opt} className="space-y-1">
                            <Label className="text-xs">Đáp án {opt}</Label>
                            <Input
                              placeholder={`Đáp án ${opt}`}
                              value={q.options[opt]}
                              onChange={(e) => updateOption(i, opt, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Đáp án đúng</Label>
                          <Select
                            value={q.correct_answer}
                            onValueChange={(v) => updateQuestion(i, 'correct_answer', v)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['A', 'B', 'C', 'D'].map((o) => (
                                <SelectItem key={o} value={o}>{o}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Giải thích (tuỳ chọn)</Label>
                          <Input
                            placeholder="Giải thích đáp án..."
                            value={q.explanation}
                            onChange={(e) => updateQuestion(i, 'explanation', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addQuestion} className="w-full gap-2">
                    <Plus className="h-4 w-4" />Thêm câu hỏi
                  </Button>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { onOpenChange(false); resetForm(); }}
              >
                Hủy
              </Button>
              <Button onClick={handleCreate} className="gap-2">
                {mode === 'ai' && <Sparkles className="h-4 w-4" />}
                {mode === 'ai' ? 'Tạo bằng AI' : 'Tạo Quiz'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
