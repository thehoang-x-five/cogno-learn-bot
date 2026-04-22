/**
 * QuizCard — displayed inside a chat bubble when the bot generates a quiz.
 * Shows quiz title + question count and a deep-link button to the QuizzesPage.
 */

import { useNavigate } from 'react-router-dom';
import { ClipboardList, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuizCardProps {
  quizId: number;
  quizTitle: string;
  questionCount: number;
  courseName?: string;
}

export function QuizCard({ quizId, quizTitle, questionCount, courseName }: QuizCardProps) {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(`/quizzes?start=${quizId}`);
  };

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 flex items-center gap-4 max-w-sm">
      {/* Icon */}
      <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
        <ClipboardList className="h-5 w-5 text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">AI Quiz</span>
        </div>
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{quizTitle}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {questionCount} câu hỏi{courseName ? ` • ${courseName}` : ''}
        </p>
      </div>

      {/* CTA */}
      <Button
        size="sm"
        className="shrink-0 gap-1.5 rounded-lg h-8 text-xs"
        onClick={handleStart}
      >
        Làm ngay
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
