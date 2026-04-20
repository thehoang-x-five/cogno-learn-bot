Đề tài: Hệ thống Chatbot Trợ giảng Thông minh (Course Assistant Chatbot) sử dụng RAG
I. Tổng quan đề tài
Xây dựng một ứng dụng web Full-stack tích hợp AI để hỗ trợ sinh viên giải đáp thắc mắc về một môn học cụ thể (Ví dụ: Nhập môn lập trình, Lịch sử Đảng, Kỹ thuật phần mềm...).
Hệ thống không chỉ trả lời dựa trên dữ liệu huấn luyện sẵn của LLM mà phải sử dụng kỹ thuật RAG (Retrieval-Augmented Generation) để tra cứu thông tin chính xác từ tài liệu của môn học (Slide bài giảng, Giáo trình PDF, Đề cương chi tiết) để đưa ra câu trả lời có căn cứ.
II. Yêu cầu về Công nghệ 
Frontend: Tự chọn
Backend: Chọn 1 trong 2:
Python & Django: Rất phù hợp vì thư viện AI/LLM chủ yếu viết bằng Python (LangChain, LlamaIndex).
NodeJS & ExpressJS: Sử dụng LangChain.js hoặc gọi sang một service phụ chạy Python (nếu chạy local LLM).
Cơ sở dữ liệu:
CSDL chính (User, Chat history): SQL hoặc MongoDB.
CSDL Vector (Vector Database): ChromaDB, Faiss, hoặc Pinecone (để lưu embeddings tài liệu).
AI/LLM Core:
Framework: LangChain hoặc LlamaIndex.
Model: Gọi API (OpenAI/Gemini) HOẶC chạy Local LLM (Llama 3, Mistral thông qua Ollama/LM Studio).
Triển khai: Bắt buộc đóng gói bằng Docker.
III. Phân cấp tính năng 
Sinh viên cần thực hiện các tính năng theo thứ tự ưu tiên dưới đây. Điểm số sẽ dựa trên mức độ hoàn thiện các cấp độ này.
Cấp độ 1: Cơ bản 
Mục tiêu: Xây dựng khung sườn ứng dụng và quản lý dữ liệu tĩnh.
Authentication: Đăng nhập (Sinh viên/Giáo viên/Admin) qua Google.
Admin quản lý danh sách giáo viên, môn học, sinh viên, sinh viên học môn nào, giáo viên dạy môn nào (có thể import từ file excel). 
Quản lý Tài liệu (Knowledge Base):
Cho phép Admin (Giáo viên) upload các file tài liệu môn học mình dạy (PDF, DOCX, TXT).
Hiển thị danh sách các tài liệu đã nộp vào hệ thống.
Giao diện Chat cơ bản: Khung chat cho phép người dùng nhập tin nhắn và nhận phản hồi (lúc này có thể chỉ là phản hồi fix cứng hoặc echo để test API). 
Lưu lịch sử chat: Lưu lại các đoạn hội thoại vào CSDL (MySQL/Mongo) để người dùng xem lại sau này.
Cấp độ 2: RAG Cơ bản 
Mục tiêu: Chatbot có thể trả lời dựa trên tài liệu đã upload.
Xử lý dữ liệu (Ingestion Pipeline):
Khi upload file, hệ thống tự động đọc nội dung (Parsing), chia nhỏ văn bản (Chunking).
Chuyển đổi văn bản thành Vector (Embedding) và lưu vào Vector Database.
Chat hỏi đáp kiến thức (Q&A):
Khi sinh viên hỏi, hệ thống tìm kiếm các đoạn văn bản liên quan nhất trong Vector DB.
Gửi câu hỏi + đoạn văn bản tìm được cho LLM để tổng hợp câu trả lời.
Trích dẫn nguồn (Source Citation): Cuối câu trả lời, chatbot phải chỉ ra thông tin được lấy từ tài liệu nào, trang số mấy (Ví dụ: "Thông tin này nằm ở trang 15, slide Chương 3").
Cấp độ 3: Nâng cao trải nghiệm (UX & Performance)
Mục tiêu: Làm cho ứng dụng mượt mà và thông minh hơn.
Streaming Response: Hiển thị câu trả lời từng từ một (như ChatGPT) thay vì bắt người dùng chờ load xong cả đoạn văn (Sử dụng Server-Sent Events hoặc WebSocket).
Quản lý ngữ cảnh hội thoại (Memory): Chatbot nhớ được các câu hỏi trước đó trong phiên làm việc để trả lời câu hỏi nối tiếp (Ví dụ: Hỏi "Khái niệm A là gì?", sau đó hỏi tiếp "Nó có ưu điểm gì?" -> Bot phải hiểu "Nó" là "Khái niệm A").
Tùy chọn Model: Cho phép người dùng (hoặc Admin) cấu hình chọn Model để trả lời (Ví dụ: Switch giữa GPT-3.5 (nhanh) và GPT-4 (thông minh), hoặc chọn model Local).
Cấp độ 4: Chuyên sâu & Agent (Thử thách)
Mục tiêu: Chatbot không chỉ trả lời lý thuyết mà còn thực hiện hành động.
Function Calling / Tool Use (Agent):
LLM có khả năng quyết định khi nào cần tra cứu tài liệu, khi nào cần tra cứu thông tin hành chính.
Ví dụ: Nếu sinh viên hỏi "Lịch thi cuối kỳ là bao giờ?", LLM không tìm trong Vector DB (nơi chứa kiến thức) mà gọi API truy vấn vào bảng LichThi trong CSDL SQL để trả lời chính xác ngày giờ.
Tạo bài tập trắc nghiệm (Quiz Generator):
Tính năng: "Hãy tạo cho tôi 5 câu hỏi ôn tập về chương 2".
Hệ thống lấy nội dung chương 2, yêu cầu LLM sinh câu hỏi trắc nghiệm + đáp án và hiển thị dưới dạng form để sinh viên làm thử.
Giáo viên có thể tạo câu hỏi trắc nghiệm trong môn học cho sinh viên làm.
GV xem được tình hình làm các phần trắc nghiệm của các SV trong lớp cụ thể.
Sinh viên chọn môn học cần chat để bắt đầu. Sinh viên có thể làm câu hỏi trắc nghiệm ngay trong màn hình chat. Hệ thống ghi nhận quá trình làm của SV.
Hybrid Search: Kết hợp tìm kiếm theo từ khóa (Keyword search) và tìm kiếm theo ngữ nghĩa (Semantic search) để nâng cao độ chính xác của kết quả tìm kiếm tài liệu.