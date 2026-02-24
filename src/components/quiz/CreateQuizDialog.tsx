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
import { Sparkles, Plus, Trash2 } from 'lucide-react';

interface CreateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function CreateQuizDialog({ open, onOpenChange }: CreateQuizDialogProps) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [chapter, setChapter] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [difficulty, setDifficulty] = useState('mixed');
  const [questions, setQuestions] = useState<ManualQuestion[]>([{ ...emptyQuestion }]);

  const addQuestion = () => setQuestions([...questions, { ...emptyQuestion }]);
  const removeQuestion = (i: number) => setQuestions(questions.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, field: keyof ManualQuestion, value: string) => {
    const updated = [...questions];
    updated[i] = { ...updated[i], [field]: value };
    setQuestions(updated);
  };

  const handleCreate = () => {
    console.log(mode === 'ai' ? { title, courseId, chapter, questionCount, difficulty } : { title, courseId, questions });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo Quiz mới</DialogTitle>
          <DialogDescription>Tạo quiz thủ công hoặc sử dụng AI để tự động tạo câu hỏi</DialogDescription>
        </DialogHeader>

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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleCreate} className="gap-2">
            {mode === 'ai' && <Sparkles className="h-4 w-4" />}
            {mode === 'ai' ? 'Tạo bằng AI' : 'Tạo Quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
