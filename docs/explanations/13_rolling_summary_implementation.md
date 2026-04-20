# 13. Rolling Summary Implementation

Đây là bản thay thế cho file `ROLLING_SUMMARY_IMPLEMENTATION.md` cũ ở root.

## Mục tiêu

Rolling summary giúp conversation dài vẫn giữ được ngữ cảnh mà không phải nhét toàn bộ lịch sử chat vào prompt.

## Dữ liệu sử dụng

### Bảng DB

- `conversation_summaries`
- `conversation_summary_metadata`

### Vector storage

Mỗi summary version còn được embed và lưu sang ChromaDB để có thể semantic search các version cũ liên quan.

## Quy tắc tạo version

`RollingSummaryService.should_create_new_version()` quyết định khi nào cần tạo version mới.

Source hiện dùng:

- `MIN_MESSAGES_FOR_SUMMARY = 4`
- `ROLLING_INTERVAL = 2`

## Luồng tạo summary

1. Lấy summary version mới nhất nếu đã có.
2. Lấy các message mới kể từ lần summarize gần nhất.
3. Gọi Gemini để tạo summary mới.
4. Lưu summary mới vào DB.
5. Embed summary mới sang ChromaDB.

## Luồng dùng summary khi chat

`MemoryManager.get_context()` sẽ lấy:

- latest summary
- old relevant summaries theo current query
- recent history

Sau đó `PromptService` ghép các phần này vào prompt cuối.

## Vì sao cần giữ nhiều version

Nếu chỉ giữ một summary rồi overwrite liên tục, thông tin cũ có thể bị “mờ” dần. Giữ nhiều version giúp:

- truy lại chi tiết ở những đoạn chat cũ
- tìm đúng phần liên quan bằng vector search
- vẫn có latest summary làm bối cảnh tổng quát
