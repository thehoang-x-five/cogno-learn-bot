import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Trophy, CheckCircle2, XCircle, Clock, RotateCcw, ArrowRight,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface QuizResultSummaryProps {
  quizTitle: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  answers: { questionText: string; selected: string; correct: string; isCorrect: boolean; explanation: string }[];
  onRetry: () => void;
  onClose: () => void;
}

export default function QuizResultSummary({
  quizTitle, score, totalQuestions, timeSpent, answers, onRetry, onClose,
}: QuizResultSummaryProps) {
  const { t } = useLanguage();
  const percentage = Math.round((score / totalQuestions) * 100);
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  const getGrade = () => {
    if (percentage >= 90) return { label: t('quizResult.excellent'), color: 'text-accent', emoji: '🏆' };
    if (percentage >= 70) return { label: t('quizResult.good'), color: 'text-primary', emoji: '👍' };
    if (percentage >= 50) return { label: t('quizResult.average'), color: 'text-warning', emoji: '📝' };
    return { label: t('quizResult.needImprovement'), color: 'text-destructive', emoji: '💪' };
  };

  const grade = getGrade();

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-2xl space-y-6">
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
                <p className="text-sm text-muted-foreground mt-2">{t('quizResult.score')}</p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <span className="text-lg font-semibold">{score} {t('quizResult.correct').toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="text-lg font-semibold">{totalQuestions - score} {t('quizResult.wrong').toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-semibold">{minutes}:{seconds.toString().padStart(2, '0')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('quizResult.detailAnswers')}</CardTitle>
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
                    <p className="font-medium text-sm">{t('quiz.questionNum')} {i + 1}: {answer.questionText}</p>
                    {!answer.isCorrect && (
                      <div className="flex gap-4 text-xs">
                        <span className="text-destructive">{t('quizResult.selected')}: {answer.selected}</span>
                        <span className="text-accent">{t('quizResult.answer')}: {answer.correct}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{answer.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('action.retry')}
          </Button>
          <Button onClick={onClose} className="gap-2">
            {t('action.backToList')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
