import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy, CheckCircle2, XCircle, Clock, RotateCcw, ArrowRight, Share2,
} from 'lucide-react';

interface QuizResultSummaryProps {
  quizTitle: string;
  score: number;
  totalQuestions: number;
  timeSpent: number; // seconds
  answers: { questionText: string; selected: string; correct: string; isCorrect: boolean; explanation: string }[];
  onRetry: () => void;
  onClose: () => void;
}

export default function QuizResultSummary({
  quizTitle, score, totalQuestions, timeSpent, answers, onRetry, onClose,
}: QuizResultSummaryProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  const getGrade = () => {
    if (percentage >= 90) return { label: 'Xuất sắc!', color: 'text-accent', emoji: '🏆' };
    if (percentage >= 70) return { label: 'Tốt!', color: 'text-primary', emoji: '👍' };
    if (percentage >= 50) return { label: 'Trung bình', color: 'text-warning', emoji: '📝' };
    return { label: 'Cần cải thiện', color: 'text-destructive', emoji: '💪' };
  };

  const grade = getGrade();

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-2xl space-y-6">
        {/* Result Header */}
        <Card className="text-center">
          <CardContent className="pt-8 pb-6">
            <div className="text-6xl mb-4">{grade.emoji}</div>
            <h2 className={`text-3xl font-bold ${grade.color}`}>{grade.label}</h2>
            <p className="text-muted-foreground mt-2">{quizTitle}</p>
            
            <div className="flex items-center justify-center gap-8 mt-6">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-24 h-24 -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <circle
                      cx="48" cy="48" r="40" fill="none"
                      stroke={percentage >= 70 ? 'hsl(var(--accent))' : percentage >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
                      strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${(percentage / 100) * 251.2} 251.2`}
                    />
                  </svg>
                  <span className="absolute text-2xl font-bold">{percentage}%</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Điểm số</p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <span className="text-lg font-semibold">{score} đúng</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="text-lg font-semibold">{totalQuestions - score} sai</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-semibold">{minutes}:{seconds.toString().padStart(2, '0')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answer Review */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết câu trả lời</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {answers.map((answer, i) => (
              <div key={i} className={`p-4 rounded-lg border ${answer.isCorrect ? 'border-accent/30 bg-accent/5' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-start gap-3">
                  {answer.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">Câu {i + 1}: {answer.questionText}</p>
                    {!answer.isCorrect && (
                      <div className="flex gap-4 text-xs">
                        <span className="text-destructive">Đã chọn: {answer.selected}</span>
                        <span className="text-accent">Đáp án: {answer.correct}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{answer.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Làm lại
          </Button>
          <Button onClick={onClose} className="gap-2">
            Quay lại danh sách
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
