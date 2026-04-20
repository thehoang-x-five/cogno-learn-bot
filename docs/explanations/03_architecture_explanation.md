# 03. Architecture Explanation

File này giải thích sơ đồ `diagrams/system_architecture.puml`.

## Thành phần chính

### Frontend

- React + Vite + TypeScript
- gọi API REST và SSE
- quản lý:
  - auth callback
  - chat UI
  - course / document pages
  - quiz pages
  - admin pages

### Backend

- FastAPI
- các router chính:
  - `auth`
  - `chat`
  - `documents`
  - `admin`
  - `courses`
  - `quiz`
  - `me`
  - `notifications`

### Async worker

- Celery worker xử lý document ingestion và tạo notifications

### Storage

- MySQL: dữ liệu nghiệp vụ
- ChromaDB: vector embeddings
- Redis: Celery broker / result backend / dedup cache / memory cache
- local volume `uploads/`: file người dùng upload

### Dịch vụ ngoài

- Google OAuth cho đăng nhập
- Gemini API cho chat, intent, tool calling, title, summary, quiz generation

## Điểm phải bảo vệ khi demo

- kiến trúc thật là `FastAPI + MySQL + Chroma + Redis/Celery + Gemini`
- không còn đúng với các tài liệu cũ mô tả `Django + PostgreSQL + pgvector + OpenAI/Ollama`
