# README - Hệ thống Chatbot Trợ giảng Thông minh

README này ghi ngắn gọn những thông tin cần thiết để chạy project trên máy giáo viên: môi trường cần có, lệnh chạy, tài khoản đăng nhập và link video demo.

## 1. Môi trường cần có

- Docker Desktop
- Git
- Máy có kết nối Internet

## 2. Thư mục project

Project có thể đặt ở bất kỳ thư mục nào trên máy giáo viên.

Chỉ cần mở terminal ngay tại thư mục gốc của project, tức là thư mục có chứa file `docker-compose.yml`, `README.md`, thư mục `BE` và `FE`.

## 3. File môi trường

Project dùng file `.env` ở thư mục gốc.

Trong trường hợp máy giáo viên chưa có file này, có thể tạo nhanh từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Nếu phải tạo lại `.env`, cần điền lại các biến sau:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GEMINI_API_KEY`

Nếu file `.env` đã có sẵn thì không cần làm thêm bước này.

## 4. Cách chạy project

Tại thư mục gốc của project, chạy:

```powershell
docker compose up -d --build
docker compose ps
```

Sau khi các service lên xong, truy cập:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## 5. Chuẩn bị tài khoản demo

Hệ thống dùng Google OAuth, nên tài khoản đăng nhập không được tạo bằng password trong database như kiểu login nội bộ.

Trước khi nộp bài, nhóm nên chuẩn bị sẵn 3 tài khoản Google demo riêng:

- `demo.chatbot.admin@gmail.com`
- `demo.chatbot.teacher@gmail.com`
- `demo.chatbot.student@gmail.com`

Nên đặt cùng một mật khẩu để giáo viên dễ thử, ví dụ:

- `ChatbotDemo@123`

Lưu ý:

- Mật khẩu này được tạo trực tiếp khi lập tài khoản Google demo, không có lệnh SQL nào để tạo password Google trong hệ thống.
- Trước khi nộp, cần thay lại đúng email và mật khẩu thật của nhóm vào README này.

## 6. Trường hợp chạy lần đầu trên máy mới

Không cần làm thêm gì. Khi MySQL container khởi tạo lần đầu (volume `mysql_data` còn trống), script trong thư mục `initdb/` sẽ **tự động chạy** và tạo sẵn:

- 3 tài khoản demo (Admin, Teacher, Student)
- 1 môn học demo (Machine learning)
- Gán giáo viên và sinh viên vào môn học

Tức là sau khi `docker compose up -d --build` xong, có thể đăng nhập Google ngay mà không cần chạy lệnh SQL nào.

### Nếu volume MySQL đã có dữ liệu cũ

Script init chỉ chạy khi volume trống. Nếu muốn reset toàn bộ để chạy lại init:

```powershell
docker compose down -v
docker compose up -d --build
```

Lệnh `down -v` sẽ xóa tất cả volume (MySQL, ChromaDB, Redis, uploads), sau đó `up --build` sẽ tạo lại từ đầu và tự động seed data.

### Nếu chỉ muốn thêm tài khoản mà không reset

Có thể chạy thủ công 1 lệnh duy nhất:

```powershell
docker compose exec -T mysql mysql -uroot -p123456 -D chatbox < initdb/01_seed_demo.sql
```


## 7. Thông tin đăng nhập

Project không dùng tài khoản nội bộ dạng username/password riêng. Đăng nhập được thực hiện qua Google.

Vì vậy:

- Username: email Google
- Password: mật khẩu Google của email tương ứng

| Vai trò | Username | Password |
|---|---|---|
| Admin | `demo.chatbot.admin@gmail.com` | `ChatbotDemo@123` |
| Teacher | `demo.chatbot.teacher@gmail.com` | `ChatbotDemo@123` |
| Student | `demo.chatbot.student@gmail.com` | `ChatbotDemo@123` |

Đường dẫn đăng nhập:

- http://localhost:3000

Sau khi mở trang, chọn nút `Đăng nhập bằng Google`, rồi đăng nhập bằng một trong các email ở bảng trên.

Trước khi nộp, cần đổi lại bảng trên theo đúng email và mật khẩu Google demo thật mà nhóm đã chuẩn bị.

## 8. Nếu đăng nhập được nhưng chatbot chưa trả lời theo tài liệu

Dữ liệu tài liệu và vector hiện được lưu theo Docker volume. Vì vậy trên máy mới có thể chưa có sẵn bộ tài liệu demo.

Khi đó chỉ cần:

1. Đăng nhập bằng tài khoản `Admin` hoặc `Teacher`
2. Vào môn học `Machine learning`
3. Upload lại tài liệu môn học
4. Chờ `celery_worker` xử lý xong
5. Quay lại màn hình chat để thử lại

## 9. Một số lệnh thường dùng

```powershell
# Xem trạng thái container
docker compose ps

# Xem log backend
docker compose logs --tail 80 backend

# Xem log frontend
docker compose logs --tail 30 frontend

# Xem log celery worker
docker compose logs --tail 80 celery_worker

# Khởi động lại backend
docker compose restart backend

# Khởi động lại frontend
docker compose restart frontend

# Khởi động lại celery worker
docker compose restart celery_worker

# Dừng hệ thống
docker compose down
```

## 10. Link video demo của nhóm

`[DÁN_LINK_VIDEO_DEMO_CỦA_NHÓM_VÀO_ĐÂY]`
