# 06. RAG Explanation

File này giải thích sơ đồ `diagrams/rag_workflow.puml`.

## Thành phần retrieve

RAG hiện tại là hybrid search thật:

- semantic search trong `ChromaDB`
- BM25 keyword search trên `document_chunks` của MySQL
- fuse bằng `RRF`
- rerank bằng cross-encoder

## Course filter

Cả vector search lẫn BM25 đều filter theo `course_id`, nên mỗi cuộc chat chỉ lấy tài liệu của đúng môn học đang mở.

## Citation

Citation được dựng từ các chunk đã rerank, không phải do LLM tự bịa:

- `document_title`
- `page_number`
- `relevance_score`
- `quote`

Sau lần sửa mới, `page_number` chỉ hiện khi thật sự có giá trị hợp lệ lớn hơn 0.

## Query rewrite

Query rewrite không nằm trong `RAGService`, mà nằm ở `ChatService` trước khi gọi `retrieve()`. Điều này quan trọng khi thuyết trình, vì workflow phải ghi đúng chỗ.

## Fallback

`RAGResult` có cờ `retrieval_fallback`. Khi retrieve yếu hoặc rỗng, metadata sẽ báo fallback để frontend / log hiển thị đúng trạng thái.
