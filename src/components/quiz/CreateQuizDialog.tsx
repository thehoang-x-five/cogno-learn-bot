import { useState, useRef } from 'react';
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
import { Sparkles, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface CreateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuizCreated?: (quiz: { title: string; courseId: string; chapter: string; questionCount: number; isAiGenerated: boolean }) => void;
}

interface ManualQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

const emptyQuestion: ManualQuestion = {
  questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', explanation: '',
};

export default function CreateQuizDialog({ open, onOpenChange, onQuizCreated }: CreateQuizDialogProps) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [chapter, setChapter] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [difficulty, setDifficulty] = useState('mixed');
  const [questions, setQuestions] = useState<ManualQuestion[]>([{ ...emptyQuestion }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const { toast } = useToast();

  const addQuestion = () => setQuestions([...questions, { ...emptyQuestion }]);
  const removeQuestion = (i: number) => setQuestions(questions.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: keyof ManualQuestion, value: string) => {
    const updated = [...questions];
    updated[i] = { ...updated[i], [field]: value };
    setQuestions(updated);
  };

  const resetForm = () => {
    setTitle('');
    setCourseId('');
    setChapter('');
    setQuestionCount('5');
    setDifficulty('mixed');
    setQuestions([{ ...emptyQuestion }]);
    setMode('ai');
    setIsGenerating(false);
    setAiProgress(0);
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tiêu đề quiz.', variant: 'destructive' });
      return;
    }
    if (!courseId) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn môn học.', variant: 'destructive' });
      return;
    }

    if (mode === 'ai') {
      // Simulate AI generation
      setIsGenerating(true);
      setAiProgress(0);
      const interval = setInterval(() => {
        setAiProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.random() * 15 + 5;
        });
      }, 300);

      setTimeout(() => {
        clearInterval(interval);
        setAiProgress(100);
        setTimeout(() => {
          onQuizCreated?.({
            title,
            courseId,
            chapter,
            questionCount: parseInt(questionCount),
            isAiGenerated: true,
          });
          toast({ title: 'Đã tạo Quiz', description: `Quiz "${title}" đã được AI tạo thành công với ${questionCount} câu hỏi.` });
          resetForm();
          onOpenChange(false);
        }, 500);
      }, 2500);
    } else {
      // Manual mode - validate at least 1 question has content
      const validQuestions = questions.filter(q => q.questionText.trim() && q.optionA.trim() && q.optionB.trim());
      if (validQuestions.length === 0) {
        toast({ title: 'Lỗi', description: 'Vui lòng nhập ít nhất 1 câu hỏi đầy đủ.', variant: 'destructive' });
        return;
      }
      onQuizCreated?.({
        title,
        courseId,
        chapter: chapter || 'Chung',
        questionCount: validQuestions.length,
        isAiGenerated: false,
      });
      toast({ title: 'Đã tạo Quiz', description: `Quiz "${title}" đã được tạo thành công với ${validQuestions.length} câu hỏi.` });
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isGenerating) { onOpenChange(o); if (!o) resetForm(); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo Quiz mới</DialogTitle>
          <DialogDescription>Tạo quiz thủ công hoặc sử dụng AI để tự động tạo câu hỏi</DialogDescription>
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
                  : `Đang phân tích tài liệu và tạo ${questionCount} câu hỏi ${difficulty === 'easy' ? 'dễ' : difficulty === 'medium' ? 'trung bình' : difficulty === 'hard' ? 'khó' : 'hỗn hợp'}`
                }
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
                  <Input placeholder="VD: Ôn tập Chương 2" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Môn học</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger><SelectValue placeholder="Chọn môn" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">CS101 - Nhập môn lập trình</SelectItem>
                      <SelectItem value="2">CS201 - Cấu trúc dữ liệu</SelectItem>
                      <SelectItem value="3">CS301 - Lập trình OOP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs value={mode} onValueChange={(v) => setMode(v as 'ai' | 'manual')}>
                <TabsList className="w-full">
                  <TabsTrigger value="ai" className="flex-1 gap-2">
                    <Sparkles className="h-4 w-4" />
                    Tạo bằng AI
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex-1 gap-2">
                    <Plus className="h-4 w-4" />
                    Tạo thủ công
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Chương / Chủ đề</Label>
                      <Input placeholder="VD: Chương 2" value={chapter} onChange={(e) => setChapter(e.target.value)} />
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
                    <div className="space-y-2">
                      <Label>Độ khó</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Dễ</SelectItem>
                          <SelectItem value="medium">Trung bình</SelectItem>
                          <SelectItem value="hard">Khó</SelectItem>
                          <SelectItem value="mixed">Hỗn hợp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary inline mr-2" />
                    AI sẽ tạo câu hỏi từ tài liệu đã upload của môn học được chọn. Đảm bảo đã upload tài liệu trước.
                  </div>
                </TabsContent>

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
                        <Textarea placeholder="Nhập câu hỏi..." value={q.questionText} onChange={(e) => updateQuestion(i, 'questionText', e.target.value)} />
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <div key={opt} className="space-y-1">
                            <Label className="text-xs">Đáp án {opt}</Label>
                            <Input
                              placeholder={`Đáp án ${opt}`}
                              value={q[`option${opt}` as keyof ManualQuestion]}
                              onChange={(e) => updateQuestion(i, `option${opt}` as keyof ManualQuestion, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Đáp án đúng</Label>
                          <Select value={q.correctAnswer} onValueChange={(v) => updateQuestion(i, 'correctAnswer', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['A', 'B', 'C', 'D'].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Giải thích</Label>
                          <Input placeholder="Giải thích..." value={q.explanation} onChange={(e) => updateQuestion(i, 'explanation', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addQuestion} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Thêm câu hỏi
                  </Button>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>Hủy</Button>
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
