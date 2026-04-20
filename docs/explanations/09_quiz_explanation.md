# 09. Quiz Explanation

File này giải thích sơ đồ `diagrams/quiz_workflow.puml`.

## 1. Quiz AI

Quiz AI có thể xuất phát từ:

- chat agent (`quiz_generator`)
- API trực tiếp `POST /api/quizzes/ai-generate`

Quiz được lưu ở bảng `generated_quizzes`.

## 2. Quiz thủ công

Giáo viên có thể tạo quiz thủ công qua:

- `POST /api/quizzes`

Source hiện không tách bảng `quiz_question`; toàn bộ câu hỏi nằm trong JSON `questions`.

## 3. Làm bài

Sinh viên nộp bài qua:

- `POST /api/quizzes/{quiz_id}/attempts`

Kết quả lưu ở `quiz_attempts`.

## 4. Thống kê

Router quiz còn có các API:

- xem attempts theo quiz
- export attempts
- thống kê theo course
- export thống kê theo course

## 5. Lưu ý thực tế

Phần AI quiz hiện đã có hybrid retrieval trong `QuizGenerator`, không còn là vector-only như bản cũ.
