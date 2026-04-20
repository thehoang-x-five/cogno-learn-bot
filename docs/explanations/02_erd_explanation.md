# 02. ERD Explanation

File này giải thích sơ đồ `diagrams/erd.puml`.

## 1. CSDL quan hệ thật

Dự án đang dùng `MySQL`. Các bảng quan trọng nhất:

- `users`, `refresh_tokens`
- `courses`, `enrollments`
- `documents`, `document_chunks`
- `conversations`, `messages`, `citations`
- `conversation_summaries`, `conversation_summary_metadata`
- `exam_schedules`
- `generated_quizzes`, `quiz_attempts`
- `notifications`
- `system_settings`

## 2. Điểm khác bản tài liệu cũ

- Khóa chính đều là `INT`, không phải `UUID`
- MySQL không lưu vector embedding trong bảng `document_chunks`
- Vector thật nằm ở `ChromaDB`
- Quiz không tách thành nhiều bảng `quiz_question`, `quiz_answer`; thay vào đó:
  - câu hỏi lưu JSON trong `generated_quizzes.questions`
  - bài làm lưu JSON trong `quiz_attempts.answers`

## 3. Cách liên kết với ChromaDB

- Mỗi `document_chunks.id` được dùng làm `id` bên Chroma
- Metadata đẩy sang Chroma gồm:
  - `document_id`
  - `course_id`
  - `filename`
  - `page_number`
  - `heading`

Vì vậy citation ở chat được dựng từ:

1. kết quả retrieve trong Chroma
2. metadata chunk trong MySQL

## 4. Rolling summary

Rolling summary có 2 bảng riêng:

- `conversation_summaries`
  - lưu từng version
- `conversation_summary_metadata`
  - lưu trạng thái version mới nhất và số message đã summarize

Thiết kế này phản ánh đúng `rolling_summary_service.py`.
