import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen, MessageSquare, ClipboardList, Star, ArrowRight,
  Sparkles, Trophy, Target, Flame, Calendar, Clock, Play,
} from 'lucide-react';

const stats = [
  { name: 'Môn học', value: '6', icon: BookOpen, color: 'text-primary' },
  { name: 'Câu hỏi đã hỏi', value: '89', icon: MessageSquare, color: 'text-accent' },
  { name: 'Quiz hoàn thành', value: '23', icon: ClipboardList, color: 'text-warning' },
  { name: 'Điểm trung bình', value: '8.5', icon: Star, color: 'text-info' },
];

const courses = [
  { id: '1', code: 'CS101', name: 'Nhập môn lập trình', progress: 75, nextQuiz: 'Quiz Chương 4' },
  { id: '2', code: 'CS201', name: 'Cấu trúc dữ liệu', progress: 45, nextQuiz: 'Quiz Chương 3' },
  { id: '3', code: 'CS301', name: 'Lập trình hướng đối tượng', progress: 90, nextQuiz: null },
];

const upcomingQuizzes = [
  { title: 'Quiz Chương 4 - Hàm', course: 'CS101', dueDate: '28/02/2026', questions: 10 },
  { title: 'Quiz Cây nhị phân', course: 'CS201', dueDate: '01/03/2026', questions: 8 },
];

const recentQuizResults = [
  { title: 'Quiz Chương 3 - Vòng lặp', course: 'CS101', score: 9, total: 10, date: '22/02/2026' },
  { title: 'Quiz Tính chất OOP', course: 'CS301', score: 8, total: 10, date: '20/02/2026' },
  { title: 'Quiz Linked List', course: 'CS201', score: 6, total: 10, date: '18/02/2026' },
];

const studyStreak = { current: 7, best: 14 };

const examSchedule = [
  { course: 'CS101', type: 'Giữa kỳ', date: '15/03/2026', time: '08:00', room: 'A305', daysLeft: 19 },
  { course: 'CS301', type: 'Giữa kỳ', date: '18/03/2026', time: '13:00', room: 'B201', daysLeft: 22 },
];

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Study Streak + CTA */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-warning/10 flex items-center justify-center">
              <Flame className="h-7 w-7 text-warning" />
            </div>
            <div>
              <p className="text-3xl font-bold">{studyStreak.current} ngày</p>
              <p className="text-sm text-muted-foreground">Chuỗi học liên tiếp (kỷ lục: {studyStreak.best})</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Hỏi AI ngay!</h3>
              <p className="text-sm text-muted-foreground">Đặt câu hỏi về bất kỳ môn học nào</p>
            </div>
            <Link to="/chat">
              <Button variant="gradient" size="lg" className="gap-2">
                <Sparkles className="h-5 w-5" />
                Chat với AI
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Courses Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tiến độ học tập</CardTitle>
                <CardDescription>Các môn đang theo học</CardDescription>
              </div>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-1">
                  Xem tất cả <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{course.name}</p>
                    <Badge variant="outline" className="text-xs">{course.code}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Progress value={course.progress} className="h-2 flex-1" />
                    <span className="text-xs font-medium w-8">{course.progress}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Quiz Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Kết quả Quiz gần đây</CardTitle>
                <CardDescription>Lịch sử làm bài</CardDescription>
              </div>
              <Link to="/quizzes">
                <Button variant="ghost" size="sm" className="gap-1">
                  Tất cả <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentQuizResults.map((result, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    result.score / result.total >= 0.8 ? 'bg-accent/10' : result.score / result.total >= 0.5 ? 'bg-warning/10' : 'bg-destructive/10'
                  }`}>
                    <Trophy className={`h-5 w-5 ${
                      result.score / result.total >= 0.8 ? 'text-accent' : result.score / result.total >= 0.5 ? 'text-warning' : 'text-destructive'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{result.title}</p>
                    <p className="text-xs text-muted-foreground">{result.course} • {result.date}</p>
                  </div>
                </div>
                <span className="text-lg font-bold">{result.score}/{result.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Quizzes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quiz sắp tới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingQuizzes.map((quiz, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground">{quiz.course} • {quiz.questions} câu</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{quiz.dueDate}</p>
                  <Link to="/quizzes">
                    <Button size="sm" variant="ghost" className="gap-1 h-7 mt-1">
                      <Play className="h-3 w-3" /> Làm bài
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Exam Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lịch thi sắp tới
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {examSchedule.map((exam, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{exam.course} - {exam.type}</Badge>
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                    Còn {exam.daysLeft} ngày
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{exam.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{exam.time}</span>
                  <span>Phòng {exam.room}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
