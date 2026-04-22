import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { courseService } from '@/services/courseService';
import type { Course } from '@/types/course';

export default function MyCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await courseService.getMyCourses();
      setCourses(response.items);
    } catch (error) {
      console.error('Error loading courses:', error);
      alert('Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Khóa học của tôi</h1>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-xl text-gray-600 mb-2">Chưa có khóa học nào</p>
            <p className="text-sm text-gray-500">Liên hệ admin để được thêm vào khóa học</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{course.code}</p>
                  </div>
                  <BookOpen className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                {course.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {course.description}
                  </p>
                )}
                {course.semester && (
                  <p className="text-xs text-gray-500 mb-2">Học kỳ: {course.semester}</p>
                )}
                <Button variant="outline" size="sm" className="w-full">
                  Xem chi tiết
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
