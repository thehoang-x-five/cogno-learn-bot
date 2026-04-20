# Chatbot Project Specification

Tài liệu này mô tả đúng kiến trúc và phạm vi hiện tại của dự án `chatbot` sau khi đối chiếu với source trong `BE/app`, `FE/src` và `docker-compose.yml`.

## 1. Mục tiêu hệ thống

Hệ thống là chatbot hỗ trợ học tập theo môn học. Sinh viên chat trong từng môn, hệ thống trả lời bằng RAG trên tài liệu đã upload, có trích dẫn nguồn, có streaming SSE, nhớ ngữ cảnh hội thoại, có tra lịch thi và tạo quiz.

## 2. Kiến trúc thực tế

- Frontend: `React + Vite + TypeScript`
- Backend: `FastAPI`
- CSDL quan hệ: `MySQL`
- Vector database: `ChromaDB`
- Cache / queue: `Redis + Celery`
- LLM runtime: `Gemini API`
- Embedding: `sentence-transformers`
- Triển khai: `Docker Compose`

## 3. Vai trò người dùng

- `Student`
  - đăng nhập Google
  - xem môn học, tài liệu, lịch sử chat
  - chat theo môn học
  - làm quiz
  - xem thông báo
- `Teacher`
  - các quyền của sinh viên trong môn mình dạy
  - upload / xóa tài liệu
  - tạo quiz thủ công
  - xem thống kê và kết quả làm quiz
  - quản lý lịch thi theo môn
- `Admin`
  - quản lý user, course, enrollment
  - import users / courses / enrollments
  - xem thống kê hệ thống
  - cấu hình LLM / RAG trong bảng `system_settings`

## 4. Các module chính

### 4.1 Authentication

- Đăng nhập qua Google OAuth.
- Email phải được admin tạo sẵn trong DB trước khi đăng nhập.
- Backend phát `access token` JWT và `refresh token`.
- Refresh token được lưu DB, frontend giữ token trong localStorage.

### 4.2 Chat

- Endpoint chính: `POST /api/conversations/{conversation_id}/messages`
- Trả về `text/event-stream`
- Có các event:
  - `progress`
  - `token`
  - `citations`
  - `metadata`
  - `saved`
  - `done`
  - `error`

### 4.3 Guardrails

- Chặn prompt injection / jailbreak
- Chặn toxic content
- Chặn PII như:
  - số điện thoại
  - CMND / CCCD
  - email cá nhân
  - số tài khoản

### 4.4 Memory

- Nạp lịch sử hội thoại gần nhất từ DB
- Cache history bằng Redis
- Có rolling summary theo version
- Có key facts trích từ lịch sử chat

### 4.5 RAG

- Semantic search trên ChromaDB
- BM25 keyword search trên MySQL chunks
- RRF fusion
- Cross-encoder rerank
- Trả citations từ chunk đã dùng
- Nếu parser có page marker thì citation giữ đúng `page_number`

### 4.6 Agent tools

- `schedule_lookup`
  - query bảng `exam_schedules`
- `quiz_generator`
  - lấy context từ document chunks
  - gọi Gemini function calling / JSON parsing
  - lưu quiz vào bảng `generated_quizzes`

### 4.7 Document ingestion

- Upload qua FastAPI
- Lưu file vào `uploads/`
- Tạo bản ghi `documents` trạng thái `PENDING`
- Queue task Celery
- Worker:
  - parse file
  - chunk text
  - lưu `document_chunks` vào MySQL
  - tạo embedding
  - lưu vector vào ChromaDB
  - cập nhật trạng thái `READY` hoặc `FAILED`

## 5. Định dạng tài liệu hỗ trợ

- Text: `txt`, `md`, `json`, `csv`, `html`, `rtf`, `odt`
- Office / slide: `docx`, `pptx`, `xlsx`
- PDF: `pdf`
- Ảnh OCR: `jpg`, `jpeg`, `png`, `webp`, `tiff`, `bmp`

## 6. Luồng chat thực tế

1. Frontend gửi SSE request tới FastAPI.
2. Router kiểm tra JWT, conversation và enrollment.
3. `ChatService` tạo `trace_id`.
4. Kiểm tra dedup cache Redis.
5. Chạy guardrails.
6. Lưu user message hoặc reuse message khi edit.
7. Nạp memory context.
8. Detect intent:
   - `GREETING`
   - `CHITCHAT`
   - `CONVERSATIONAL`
   - `SCHEDULE_QUERY`
   - `QUIZ_REQUEST`
   - `KNOWLEDGE_QA`
9. Nếu là agent intent thì chạy `AgentOrchestrator`.
10. Nếu là knowledge QA thì chạy RAG.
11. Stream token về frontend.
12. Lưu assistant message, citations, metadata.
13. Invalidate memory cache, có thể tạo rolling summary mới.

## 7. Các bảng dữ liệu chính

- `users`
- `refresh_tokens`
- `courses`
- `enrollments`
- `documents`
- `document_chunks`
- `conversations`
- `messages`
- `citations`
- `conversation_summaries`
- `conversation_summary_metadata`
- `exam_schedules`
- `generated_quizzes`
- `quiz_attempts`
- `notifications`
- `system_settings`

Lưu ý: embedding không nằm trong MySQL. Vector được lưu riêng trong ChromaDB, khóa liên kết chính là `document_chunks.id`.

## 8. Triển khai

Docker Compose hiện có các service:

- `mysql`
- `chromadb`
- `redis`
- `backend`
- `celery_worker`
- `frontend`

## 9. Source of truth

Khi cần đối chiếu hành vi thật, ưu tiên đọc các file sau:

- `BE/app/services/chat_service.py`
- `BE/app/services/rag_service.py`
- `BE/app/services/agent_orchestrator.py`
- `BE/app/services/document_service.py`
- `BE/app/tasks/document_tasks.py`
- `BE/app/services/advanced_parser.py`
- `BE/app/services/tools/quiz_generator.py`
- `BE/app/services/tools/schedule_lookup.py`
- `BE/app/models/*.py`
- `BE/app/routers/*.py`
