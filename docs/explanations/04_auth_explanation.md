# 04. Auth Explanation

File này giải thích sơ đồ `diagrams/auth_workflow.puml`.

## Luồng đúng theo source

1. Frontend mở `GET /api/auth/google/login`
2. Backend redirect sang Google
3. Google trả `code` về `GET /api/auth/google/callback`
4. Backend đổi code lấy userinfo
5. Backend chỉ cho đăng nhập nếu email đã tồn tại trong DB
6. Nếu là lần đầu login thì liên kết `google_id` cho user đó
7. Backend tạo:
   - access token JWT
   - refresh token ngẫu nhiên
8. Refresh token được lưu ở bảng `refresh_tokens`
9. Backend redirect về frontend:
   - `/auth/callback?access_token=...&refresh_token=...&role=...`
10. Frontend lưu token vào localStorage

## Điểm khác bản doc cũ

- không dùng HttpOnly cookie
- không có nonce / cookie rotation ở frontend theo kiểu browser session
- email không tự đăng ký mới; admin phải tạo sẵn user trong DB

## Refresh token

- `POST /api/auth/refresh`
- backend revoke token cũ và phát cặp token mới

## Logout

- `POST /api/auth/logout`
- `POST /api/auth/logout/all`

Cả hai đều dựa trên bảng `refresh_tokens`.
