# 01. Use Case Explanation

File này giải thích sơ đồ `diagrams/usecase.puml`.

## Actors chính

- `Student`
  - dùng chat, xem tài liệu, làm quiz, xem lịch thi, xem thông báo
- `Teacher`
  - upload tài liệu, tạo quiz thủ công, dùng AI quiz, xem attempts và thống kê
- `Admin`
  - quản lý users, courses, enrollments, import dữ liệu, cấu hình hệ thống
- `Google OAuth`
  - hệ thống xác thực ngoài
- `Gemini API`
  - dịch vụ LLM ngoài để xử lý chat và sinh quiz

## Ý nghĩa sơ đồ

Sơ đồ này gom use case theo đúng những gì source hiện có, thay vì mô tả theo đề cương cũ. Điểm quan trọng là:

- đăng nhập chỉ có Google OAuth, không có local username/password trong app
- quiz có 2 đường:
  - tạo quiz bằng AI
  - tạo quiz thủ công
- admin có module settings riêng để cấu hình LLM / RAG

## Các quan hệ cần lưu ý

- `Chat theo môn học` luôn đi cùng `Xem citation / nguồn tham khảo`
- `Tạo quiz bằng AI` là nhánh mở rộng của luồng quiz
- `Upload tài liệu` phục vụ trực tiếp cho RAG và quiz AI
