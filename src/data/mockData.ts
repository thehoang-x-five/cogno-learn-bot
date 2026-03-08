import type { User } from '@/types/user';
import type { Course } from '@/types/course';
import type { Document } from '@/types/document';
import type { Conversation, Message } from '@/types/chat';
import type { Quiz, QuizQuestion, QuizAttempt } from '@/types/quiz';
import type { Notification } from '@/types/notification';

// ─── Users ──────────────────────────────────────────────
export const mockUsers: Record<string, User> = {
  admin: { id: '1', email: 'admin@edu.vn', fullName: 'Nguyễn Văn Admin', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', role: 'admin', isActive: true, createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
  teacher: { id: '2', email: 'teacher@edu.vn', fullName: 'Trần Thị Giáo Viên', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher', role: 'teacher', isActive: true, createdAt: new Date(Date.now() - 180 * 86400000).toISOString() },
  student: { id: '3', email: 'student@edu.vn', fullName: 'Lê Văn Sinh Viên', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student', role: 'student', isActive: true, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
};

export const mockAllUsers: User[] = [
  mockUsers.admin,
  mockUsers.teacher,
  { id: '2b', email: 'teacher2@edu.vn', fullName: 'Lê Văn Giảng', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher2', role: 'teacher', isActive: true, createdAt: new Date(Date.now() - 120 * 86400000).toISOString() },
  { id: '4', email: 'student1@edu.vn', fullName: 'Phạm Minh Sinh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1', role: 'student', isActive: true, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: '5', email: 'student2@edu.vn', fullName: 'Hoàng Thị Học', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student2', role: 'student', isActive: true, createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: '6', email: 'student3@edu.vn', fullName: 'Võ Văn Viên', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student3', role: 'student', isActive: false, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

// ─── Courses ──────────────────────────────────────────
export const mockCourses: Course[] = [
  { id: '1', code: 'CS101', name: 'Nhập môn lập trình', description: 'Môn học cơ sở về lập trình với Python, bao gồm các khái niệm cơ bản như biến, vòng lặp, hàm...', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 2, studentCount: 120, documentCount: 15 },
  { id: '2', code: 'CS201', name: 'Cấu trúc dữ liệu và giải thuật', description: 'Học về các cấu trúc dữ liệu như mảng, danh sách liên kết, cây, đồ thị và các giải thuật sắp xếp, tìm kiếm...', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 1, studentCount: 95, documentCount: 22 },
  { id: '3', code: 'CS301', name: 'Lập trình hướng đối tượng', description: 'Các nguyên lý OOP: đóng gói, kế thừa, đa hình, trừu tượng. Thực hành với Java.', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'teacher', teacherCount: 1, studentCount: 88, documentCount: 18 },
  { id: '4', code: 'CS401', name: 'Cơ sở dữ liệu', description: 'Thiết kế và quản trị cơ sở dữ liệu quan hệ, SQL, normalization, indexing...', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 2, studentCount: 110, documentCount: 20 },
  { id: '5', code: 'CS501', name: 'Trí tuệ nhân tạo', description: 'Giới thiệu về AI, Machine Learning, Neural Networks và các ứng dụng thực tế.', semester: 'HK1-2025', isActive: true, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 1, studentCount: 75, documentCount: 12 },
  { id: '6', code: 'CS601', name: 'Phát triển Web', description: 'Full-stack web development với React, Node.js, và các công nghệ hiện đại.', semester: 'HK1-2025', isActive: false, createdAt: new Date().toISOString(), enrollmentRole: 'student', teacherCount: 2, studentCount: 130, documentCount: 25 },
];

// ─── Documents ──────────────────────────────────────────
export const mockDocuments: Document[] = [
  { id: '1', courseId: '3', uploadedBy: '2', filename: 'slide_chuong1_gioi_thieu_oop.pdf', filePath: '/docs/1', fileType: 'pdf', fileSize: 2048000, status: 'ready', totalChunks: 45, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', courseId: '3', uploadedBy: '2', filename: 'slide_chuong2_tinh_chat_oop.pdf', filePath: '/docs/2', fileType: 'pdf', fileSize: 3145728, status: 'ready', totalChunks: 62, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', courseId: '3', uploadedBy: '2', filename: 'giao_trinh_lap_trinh_oop.docx', filePath: '/docs/3', fileType: 'docx', fileSize: 5242880, status: 'processing', totalChunks: 0, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '4', courseId: '1', uploadedBy: '2', filename: 'python_basics.pdf', filePath: '/docs/4', fileType: 'pdf', fileSize: 1536000, status: 'ready', totalChunks: 38, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: '5', courseId: '2', uploadedBy: '2', filename: 'algorithms_sorting.pdf', filePath: '/docs/5', fileType: 'pdf', fileSize: 2867200, status: 'error', totalChunks: 0, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '6', courseId: '1', uploadedBy: '2', filename: 'exercises_chapter1.txt', filePath: '/docs/6', fileType: 'txt', fileSize: 51200, status: 'pending', totalChunks: 0, createdAt: new Date().toISOString() },
];

// ─── Conversations & Messages ──────────────────────────
export const mockConversations: Conversation[] = [
  { id: '1', userId: '3', courseId: '3', title: 'Hỏi về OOP và tính đa hình', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastMessage: 'Đa hình là gì?' },
  { id: '2', userId: '3', courseId: '1', title: 'Vòng lặp trong Python', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastMessage: 'Cách sử dụng for loop' },
  { id: '3', userId: '3', courseId: '2', title: 'Thuật toán sắp xếp', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastMessage: 'Quick sort hoạt động như nào?' },
];

export const mockMessages: Message[] = [
  { id: '1', conversationId: '1', role: 'user', content: 'OOP là gì?', createdAt: new Date(Date.now() - 60000).toISOString() },
  { id: '2', conversationId: '1', role: 'assistant',
    content: `**OOP (Object-Oriented Programming)** là một mô hình lập trình dựa trên khái niệm "đối tượng" (objects).\n\n## 4 tính chất chính của OOP:\n\n1. **Đóng gói (Encapsulation)**: Gói dữ liệu và phương thức vào trong một đơn vị (class), ẩn chi tiết triển khai.\n\n2. **Kế thừa (Inheritance)**: Cho phép class con kế thừa thuộc tính và phương thức từ class cha.\n\n3. **Đa hình (Polymorphism)**: Cùng một phương thức có thể hoạt động khác nhau tùy thuộc vào đối tượng.\n\n4. **Trừu tượng (Abstraction)**: Ẩn đi chi tiết phức tạp, chỉ hiển thị những gì cần thiết.\n\n\`\`\`java\npublic class Animal {\n    private String name;\n    \n    public void speak() {\n        System.out.println("Some sound");\n    }\n}\n\`\`\``,
    tokensUsed: 250, modelUsed: 'gpt-4-turbo', createdAt: new Date(Date.now() - 55000).toISOString(),
    citations: [
      { id: '1', messageId: '2', chunkId: 'c1', relevanceScore: 0.89, quote: 'OOP có 4 tính chất chính...', documentName: 'slide_chuong2.pdf', pageNumber: 15 },
      { id: '2', messageId: '2', chunkId: 'c2', relevanceScore: 0.76, quote: 'Đa hình cho phép...', documentName: 'giaotrinh.pdf', pageNumber: 42 },
    ],
  },
  { id: '3', conversationId: '1', role: 'user', content: 'Cho tôi ví dụ về tính đa hình trong Java', createdAt: new Date(Date.now() - 30000).toISOString() },
  { id: '4', conversationId: '1', role: 'assistant',
    content: `Đây là ví dụ về **đa hình (Polymorphism)** trong Java:\n\n\`\`\`java\nclass Animal {\n    public void makeSound() {\n        System.out.println("Some generic sound");\n    }\n}\n\nclass Dog extends Animal {\n    @Override\n    public void makeSound() {\n        System.out.println("Woof! Woof!");\n    }\n}\n\nclass Cat extends Animal {\n    @Override\n    public void makeSound() {\n        System.out.println("Meow!");\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Animal myDog = new Dog();\n        Animal myCat = new Cat();\n        \n        myDog.makeSound();  // Output: Woof! Woof!\n        myCat.makeSound();  // Output: Meow!\n    }\n}\n\`\`\`\n\nTrong ví dụ trên, cùng phương thức \`makeSound()\` nhưng mỗi đối tượng lại có hành vi khác nhau. Đây chính là **đa hình runtime** (method overriding).`,
    tokensUsed: 180, modelUsed: 'gpt-4-turbo', createdAt: new Date(Date.now() - 25000).toISOString(),
    citations: [
      { id: '3', messageId: '4', chunkId: 'c3', relevanceScore: 0.92, quote: 'Polymorphism cho phép override method...', documentName: 'slide_chuong2.pdf', pageNumber: 28 },
    ],
  },
];

// ─── Quizzes ──────────────────────────────────────────
export const mockQuizzes: Quiz[] = [
  { id: '1', courseId: '3', createdBy: '2', title: 'Ôn tập Chương 1 - Giới thiệu OOP', chapter: 'Chương 1', isAiGenerated: true, questionCount: 10, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', courseId: '3', createdBy: '2', title: 'Kiểm tra 4 tính chất OOP', chapter: 'Chương 2', isAiGenerated: true, questionCount: 5, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', courseId: '1', createdBy: '2', title: 'Python cơ bản - Vòng lặp', chapter: 'Chương 3', isAiGenerated: false, questionCount: 8, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: '4', courseId: '2', createdBy: '2', title: 'Thuật toán sắp xếp', chapter: 'Chương 4', isAiGenerated: true, questionCount: 12, createdAt: new Date(Date.now() - 345600000).toISOString() },
];

export const mockQuizQuestions: QuizQuestion[] = [
  { id: '1', quizId: '1', questionText: 'OOP có bao nhiêu tính chất chính?', optionA: '2 tính chất', optionB: '3 tính chất', optionC: '4 tính chất', optionD: '5 tính chất', correctAnswer: 'C', explanation: '4 tính chất chính của OOP: Đóng gói, Kế thừa, Đa hình, Trừu tượng.', difficulty: 'easy' },
  { id: '2', quizId: '1', questionText: 'Tính chất nào cho phép class con sử dụng lại code từ class cha?', optionA: 'Đóng gói', optionB: 'Kế thừa', optionC: 'Đa hình', optionD: 'Trừu tượng', correctAnswer: 'B', explanation: 'Kế thừa (Inheritance) cho phép class con kế thừa thuộc tính và phương thức từ class cha.', difficulty: 'easy' },
  { id: '3', quizId: '1', questionText: 'Từ khóa nào dùng để khai báo class trong Java?', optionA: 'define', optionB: 'struct', optionC: 'class', optionD: 'object', correctAnswer: 'C', explanation: 'Trong Java, từ khóa "class" được sử dụng để khai báo một class mới.', difficulty: 'easy' },
];

export const mockQuizAttempts: QuizAttempt[] = [
  { id: '1', quizId: '1', userId: '3', score: 8, totalQuestions: 10, timeSpentSeconds: 320, startedAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 86100000).toISOString() },
  { id: '2', quizId: '2', userId: '3', score: 4, totalQuestions: 5, timeSpentSeconds: 180, startedAt: new Date(Date.now() - 172800000).toISOString(), completedAt: new Date(Date.now() - 172500000).toISOString() },
  { id: '3', quizId: '3', userId: '3', score: 6, totalQuestions: 8, timeSpentSeconds: 450, startedAt: new Date(Date.now() - 259200000).toISOString(), completedAt: new Date(Date.now() - 258800000).toISOString() },
];

// ─── Notifications ────────────────────────────────────
export const mockNotifications: Notification[] = [
  { id: '1', title: 'Quiz mới được giao', description: 'CS301 - Lập trình OOP • Hạn nộp: 15/03/2026', time: '5 phút trước', type: 'quiz', read: false },
  { id: '2', title: 'Tài liệu đã xử lý xong', description: 'slide_chuong3.pdf đã được phân tích và index thành công', time: '1 giờ trước', type: 'document', read: false },
  { id: '3', title: 'Điểm quiz: 8/10', description: 'Quiz OOP Chương 1 — Xếp hạng: Top 15%', time: '3 giờ trước', type: 'quiz', read: false },
  { id: '4', title: 'AI đã trả lời câu hỏi của bạn', description: 'Trong hội thoại "Hỏi về OOP và tính đa hình"', time: '5 giờ trước', type: 'chat', read: true },
  { id: '5', title: '3 sinh viên mới tham gia CS301', description: 'Nguyễn Văn A, Trần Thị B, Lê Văn C đã đăng ký', time: '1 ngày trước', type: 'course', read: true },
  { id: '6', title: 'Bảo trì hệ thống dự kiến', description: 'Hệ thống sẽ bảo trì từ 02:00 - 04:00 ngày 10/03', time: '1 ngày trước', type: 'system', read: true },
  { id: '7', title: 'Hoàn thành 10 quiz liên tiếp! 🎉', description: 'Bạn đã đạt huy hiệu "Quiz Master"', time: '2 ngày trước', type: 'achievement', read: true },
  { id: '8', title: 'Tài liệu mới: giaotrinh_chuong4.pdf', description: 'Giáo viên đã upload tài liệu mới cho CS201', time: '3 ngày trước', type: 'document', read: true },
];
