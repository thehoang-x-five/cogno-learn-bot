# 07. Ingestion Explanation

File này giải thích sơ đồ `diagrams/ingestion_workflow.puml`.

## Upload phase

`DocumentService.upload_document()` làm 3 việc:

1. validate quyền và file
2. lưu file vật lý vào thư mục `uploads/`
3. tạo bản ghi `documents` trạng thái `PENDING` rồi queue Celery

API không chờ parse xong mới trả.

## Worker phase

`process_document_task()` trong Celery worker thực hiện:

1. parse file
2. chunk text
3. lưu `document_chunks`
4. tạo embeddings
5. đẩy vectors sang Chroma
6. cập nhật document sang `READY` hoặc `FAILED`

## Parser thực tế

`advanced_parser.py` hiện hỗ trợ:

- PDF
- DOCX
- PPTX
- XLSX
- HTML / RTF / ODT
- CSV / JSON
- image OCR

## Chính sách OCR ảnh nhúng

Parser hiện dùng rule:

- ảnh `>= 10KB` mới OCR
- tối đa `10` ảnh OCR cho mỗi file

Mục tiêu là không bỏ qua screenshot / sơ đồ có chữ, nhưng tránh treo worker bởi icon nhỏ, bullet, logo.

## Chunking và citation

Chunking dùng `chunking_service.py` để giữ `page_number` nếu parser đã chèn marker `# Page N`. Đây là phần quan trọng để citation hiển thị đúng trang ở chat.
