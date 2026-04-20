# 12. Chat Flow Step By Step

Đây là bản thay thế cho file `CHAT_FLOW_STEP_BY_STEP.md` cũ ở root.

## Bước 1. Frontend gọi SSE

Frontend gọi:

- `POST /api/conversations/{conversation_id}/messages`

Headers:

- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:

```json
{
  "content": "Câu hỏi của người dùng",
  "model": "gemini-2.5-flash"
}
```

## Bước 2. Router kiểm tra quyền

Router kiểm tra:

- token hợp lệ
- conversation tồn tại và thuộc user
- user có enrollment trong course của conversation

## Bước 3. ChatService khởi tạo request

`ChatService.process_message()`:

- tạo `trace_id`
- emit `progress`
- kiểm tra dedup cache

## Bước 4. Guardrails

Chặn ngay nếu phát hiện:

- prompt injection
- toxic content
- PII như CCCD / CMND / email / số điện thoại

## Bước 5. Lưu user message

Nếu là gửi mới thì tạo message mới.

Nếu là luồng edit thì reuse message user đã được sửa và skip việc tạo thêm user message.

## Bước 6. Nạp memory context

Ưu tiên Redis cache. Nếu miss thì `MemoryManager` load:

- recent messages
- rolling summary mới nhất
- old relevant summaries
- key facts

## Bước 7. Detect intent

`detect_intent_and_respond_llm()` chạy:

1. keyword pre-filter
2. Gemini classify

## Bước 8. Rẽ nhánh xử lý

### Nhánh direct

- `GREETING`
- `CHITCHAT`
- `CONVERSATIONAL`

Gemini trả lời trực tiếp, không vào RAG.

### Nhánh agent

- `SCHEDULE_QUERY`
- `QUIZ_REQUEST`

Đi qua `AgentOrchestrator`.

### Nhánh knowledge QA

Đi qua `RAGService.retrieve()`.

## Bước 9. Stream token

Backend stream token về frontend bằng event `token`.

## Bước 10. Emit citations và metadata

Nếu là knowledge QA thì có event `citations`.

Sau đó backend emit `metadata` và `done`.

## Bước 11. Lưu DB và cache

Backend lưu:

- assistant message
- citations
- agent metadata nếu có

Sau đó:

- invalidate memory cache
- lưu dedup cache
- có thể tạo rolling summary mới
- refresh conversation title
