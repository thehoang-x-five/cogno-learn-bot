# API Documentation

Tài liệu này bám theo router thật trong `BE/app/routers`.

## Base URL

- Backend local: `http://localhost:8000`

## 1. Health

- `GET /`
  - trạng thái service
- `GET /health`
  - healthcheck cho Docker

## 2. Authentication - `/api/auth`

- `GET /google/login`
  - redirect sang Google OAuth
- `GET /google/callback`
  - nhận `code` từ Google, kiểm tra email đã được đăng ký, phát token và redirect về frontend
- `POST /refresh`
  - cấp lại access token và refresh token mới
- `POST /logout`
  - revoke refresh token hiện tại
- `POST /logout/all`
  - revoke tất cả refresh token của user
- `GET /me`
  - lấy profile hiện tại
- `PATCH /me`
  - cập nhật `full_name`, `avatar_url`
- `PATCH /users/{user_id}/role`
  - admin đổi role user

## 3. Conversations / Chat - `/api/conversations`

- `GET /`
  - danh sách conversation của user
- `POST /`
  - tạo conversation mới theo course
- `GET /{conversation_id}`
  - chi tiết conversation + messages + citations
- `DELETE /{conversation_id}`
  - xóa conversation
- `POST /{conversation_id}/messages`
  - gửi message mới theo SSE
- `PUT /{conversation_id}/messages/{message_id}/edit`
  - sửa một user message, rollback các message phía sau rồi sinh lại câu trả lời

### SSE events của chat

- `progress`
- `token`
- `citations`
- `metadata`
- `saved`
- `done`
- `error`

## 4. Documents - `/api/documents`

- `POST /upload`
  - upload tài liệu, tạo record `PENDING`, queue Celery
- `GET /{document_id}/status`
  - xem tiến độ xử lý
- `GET /`
  - danh sách tài liệu
- `GET /{document_id}`
  - chi tiết tài liệu
- `DELETE /{document_id}`
  - xóa tài liệu
- `GET /course/{course_id}/stats`
  - thống kê tài liệu theo môn
- `GET /{document_id}/download`
  - tải file gốc
- `GET /{document_id}/view`
  - xem file

## 5. Courses - `/api/courses`

- `GET /my-courses`
  - danh sách môn của user
- `GET /{course_id}/detail`
  - chi tiết môn + enrollments
- `GET /{course_id}/can-upload`
  - kiểm tra user có quyền upload hay không
- `POST /{course_id}/import-students`
  - import sinh viên vào môn
- `POST /{course_id}/enrollments`
  - tạo enrollment
- `DELETE /{course_id}/enrollments/{enrollment_id}`
  - xóa enrollment

## 6. Admin - `/api/admin`

### Dashboard / statistics

- `GET /statistics`
- `GET /dashboard/activity`
- `GET /dashboard/traffic-today`

### Users

- `GET /users`
- `GET /users/recent`
- `GET /users/{user_id}`
- `POST /users`
- `PUT /users/{user_id}`
- `DELETE /users/{user_id}`

### Courses

- `GET /courses`
- `GET /courses/{course_id}`
- `POST /courses`
- `POST /courses/with-enrollments`
- `PUT /courses/{course_id}`
- `DELETE /courses/{course_id}`

### Enrollments

- `GET /enrollments`
- `POST /enrollments`
- `DELETE /enrollments/{enrollment_id}`

### Import

- `POST /import/users`
- `POST /import/courses`
- `POST /import/enrollments`

### Settings

- `GET /settings`
- `PUT /settings`

## 7. Quizzes & schedules - `/api/quizzes`

### Quiz attempts của sinh viên

- `GET /me/attempts`
- `GET /me/attempts/export`

### Exam schedule

- `GET /schedules/course/{course_id}`
- `POST /schedules/course/{course_id}`
- `PUT /schedules/{schedule_id}`
- `DELETE /schedules/{schedule_id}`

### Quiz stats theo môn

- `GET /stats/course/{course_id}`
- `GET /stats/course/{course_id}/export`

### Quiz CRUD

- `GET /`
- `GET /{quiz_id}`
- `POST /`
  - tạo quiz thủ công
- `POST /ai-generate`
  - tạo quiz AI qua API riêng
- `DELETE /{quiz_id}`

### Attempts

- `POST /{quiz_id}/attempts`
- `GET /{quiz_id}/attempts/export`
- `GET /{quiz_id}/attempts`

## 8. Me - `/api/me`

- `GET /dashboard-stats`

## 9. Notifications - `/api/notifications`

- `GET /count`
- `GET /`
- `PATCH /{notif_id}/read`
- `PATCH /read-all`
- `DELETE /{notif_id}`

## 10. Ghi chú implementation

- Backend không dùng `/api/v1`; prefix thật là các route ở trên.
- Authentication hiện dùng Google OAuth + JWT tự phát hành ở backend.
- Chat sử dụng `text/event-stream`, không dùng WebSocket.
- Vector search dùng ChromaDB, không dùng pgvector.
- Một số API trả JSON tự do thay vì DTO cố định; khi cần kiểm tra chính xác shape response nên xem trực tiếp router và service tương ứng.
