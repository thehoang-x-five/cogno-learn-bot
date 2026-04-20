# 05. Chat Explanation

File này giải thích sơ đồ `diagrams/chat_workflow.puml`.

## Endpoint lõi

- `POST /api/conversations/{conversation_id}/messages`
- response là `text/event-stream`

## Các bước chính

1. Router kiểm tra JWT, ownership của conversation và enrollment theo course.
2. `ChatService` tạo `trace_id`.
3. Kiểm tra dedup cache trong Redis.
4. Chạy guardrails:
   - toxic
   - jailbreak / injection
   - PII
5. Lưu user message.
6. Nạp memory context:
   - history gần nhất
   - rolling summary
   - key facts
7. Detect intent.
8. Rẽ nhánh:
   - direct response
   - conversational response
   - agent tool
   - knowledge QA bằng RAG
9. Stream token về frontend.
10. Lưu assistant message, citation và metadata.

## Các event SSE

- `progress`
- `token`
- `citations`
- `metadata`
- `saved`
- `done`
- `error`

## Edit / regenerate

Source còn có luồng:

- `PUT /api/conversations/{conversation_id}/messages/{message_id}/edit`

Luồng này rollback toàn bộ message phía sau message được sửa, sau đó chạy lại pipeline chat trên cùng conversation.
