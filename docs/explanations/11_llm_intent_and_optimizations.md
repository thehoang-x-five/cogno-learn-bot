# 11. LLM Intent And Optimizations

Tài liệu này tóm tắt các tối ưu đang có trong code, không ghi theo bản thiết kế cũ.

## Intent detection

Luồng detect intent hiện tại:

1. keyword pre-filter
2. nếu chưa chắc thì gọi Gemini intent model
3. intent có thể ra:
   - `GREETING`
   - `CHITCHAT`
   - `CONVERSATIONAL`
   - `SCHEDULE_QUERY`
   - `QUIZ_REQUEST`
   - `KNOWLEDGE_QA`

## Optimizations đang có thật

### Dedup cache

- dùng Redis
- TTL mặc định: `5s`
- tránh xử lý lặp khi user bấm gửi liên tiếp cùng câu hỏi

### Memory cache

- cache history conversation bằng Redis
- TTL mặc định: `60s`

### Query rewrite

- với câu quá ngắn và có history
- `ChatService` hỏi Gemini để rewrite thành search query đầy đủ hơn

### Rolling summary

- summary theo version
- tạo version mới định kỳ
- memory có thể lấy latest summary và old relevant summaries

### Hybrid RAG

- Chroma vector search
- BM25 MySQL
- RRF fusion
- cross-encoder rerank

### Function calling cho agent

- Gemini chọn `schedule_lookup` hoặc `quiz_generator`
- chat metadata ghi rõ `tool_selection_mode`

## Timeouts cấu hình

Các timeout chính lấy từ `config.py`:

- `RAG_RETRIEVE_TIMEOUT`
- `RAG_RERANK_TIMEOUT`
- `INTENT_DETECT_TIMEOUT`
- `MEMORY_RECALL_TIMEOUT`

Mục tiêu là để request không treo quá lâu khi model hoặc retrieve chậm.
