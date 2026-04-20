# 08. Agent Explanation

File này giải thích sơ đồ `diagrams/agent_workflow.puml`.

## Ý chính

`AgentOrchestrator` hiện không còn là router thuần pattern matching. Nó dùng `Gemini function calling` để chọn tool.

## Hai tool đang có thật

- `schedule_lookup`
  - đọc từ bảng `exam_schedules`
  - hỗ trợ `exam_type`
- `quiz_generator`
  - lấy context từ chunks
  - gọi Gemini để sinh câu hỏi
  - lưu quiz vào `generated_quizzes`

## Fallback

Nếu Gemini không trả function call, orchestrator vẫn có `legacy_fallback` theo intent để tránh chết luồng.

## Metadata trả về

Chat metadata hiện có:

- `tool_used`
- `tool_selection_mode`
- `agent_metadata`

Điểm này giúp chứng minh được với giảng viên là hệ thống đang dùng function calling thật, không phải chỉ ghi chú trong tài liệu.
