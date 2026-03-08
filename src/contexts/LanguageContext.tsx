import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'vi' | 'en';

const translations: Record<string, Record<Language, string>> = {
  // Sidebar
  'nav.dashboard': { vi: 'Dashboard', en: 'Dashboard' },
  'nav.courses': { vi: 'Môn học', en: 'Courses' },
  'nav.chat': { vi: 'Chat AI', en: 'AI Chat' },
  'nav.documents': { vi: 'Tài liệu', en: 'Documents' },
  'nav.quizzes': { vi: 'Quiz', en: 'Quizzes' },
  'nav.users': { vi: 'Người dùng', en: 'Users' },
  'nav.settings': { vi: 'Cài đặt', en: 'Settings' },
  'nav.profile': { vi: 'Tài khoản', en: 'Account' },
  'nav.logout': { vi: 'Đăng xuất', en: 'Sign Out' },
  'nav.accountSettings': { vi: 'Cài đặt tài khoản', en: 'Account Settings' },

  // Roles
  'role.admin': { vi: 'Quản trị viên', en: 'Admin' },
  'role.teacher': { vi: 'Giáo viên', en: 'Teacher' },
  'role.student': { vi: 'Sinh viên', en: 'Student' },

  // Common actions
  'action.save': { vi: 'Lưu thay đổi', en: 'Save Changes' },
  'action.cancel': { vi: 'Hủy', en: 'Cancel' },
  'action.delete': { vi: 'Xóa', en: 'Delete' },
  'action.edit': { vi: 'Chỉnh sửa', en: 'Edit' },
  'action.preview': { vi: 'Xem trước', en: 'Preview' },
  'action.download': { vi: 'Tải xuống', en: 'Download' },
  'action.search': { vi: 'Tìm kiếm...', en: 'Search...' },
  'action.create': { vi: 'Tạo mới', en: 'Create' },
  'action.duplicate': { vi: 'Nhân bản', en: 'Duplicate' },
  'action.share': { vi: 'Chia sẻ', en: 'Share' },
  'action.reset': { vi: 'Khôi phục mặc định', en: 'Reset to Default' },
  'action.start': { vi: 'Bắt đầu', en: 'Start' },

  // Dashboard
  'dashboard.title': { vi: 'Dashboard', en: 'Dashboard' },

  // Courses
  'courses.title': { vi: 'Môn học', en: 'Courses' },
  'courses.create': { vi: 'Thêm môn học', en: 'Add Course' },
  'courses.search': { vi: 'Tìm kiếm môn học...', en: 'Search courses...' },

  // Documents
  'docs.title': { vi: 'Tài liệu', en: 'Documents' },
  'docs.subtitle': { vi: 'Quản lý tài liệu môn học cho hệ thống RAG', en: 'Manage course documents for RAG system' },
  'docs.upload': { vi: 'Tải lên tài liệu', en: 'Upload Document' },
  'docs.uploadDesc': { vi: 'Kéo thả file hoặc click để chọn • PDF, DOCX, TXT', en: 'Drag & drop or click to select • PDF, DOCX, TXT' },
  'docs.chooseFile': { vi: 'Chọn file', en: 'Choose File' },
  'docs.total': { vi: 'Tổng tài liệu', en: 'Total Documents' },
  'docs.processed': { vi: 'Đã xử lý', en: 'Processed' },
  'docs.processing': { vi: 'Đang xử lý', en: 'Processing' },
  'docs.totalChunks': { vi: 'Tổng chunks', en: 'Total Chunks' },
  'docs.searchDocs': { vi: 'Tìm kiếm tài liệu...', en: 'Search documents...' },
  'docs.allCourses': { vi: 'Tất cả môn học', en: 'All Courses' },
  'docs.filename': { vi: 'Tên file', en: 'Filename' },
  'docs.course': { vi: 'Môn học', en: 'Course' },
  'docs.size': { vi: 'Kích thước', en: 'Size' },
  'docs.chunks': { vi: 'Chunks', en: 'Chunks' },
  'docs.status': { vi: 'Trạng thái', en: 'Status' },
  'docs.date': { vi: 'Ngày tải', en: 'Upload Date' },
  'docs.statusReady': { vi: 'Sẵn sàng', en: 'Ready' },
  'docs.statusProcessing': { vi: 'Đang xử lý', en: 'Processing' },
  'docs.statusPending': { vi: 'Chờ xử lý', en: 'Pending' },
  'docs.statusError': { vi: 'Lỗi', en: 'Error' },
  'docs.notFound': { vi: 'Không tìm thấy tài liệu', en: 'No documents found' },
  'docs.notFoundDesc': { vi: 'Thử tìm kiếm với từ khóa khác hoặc chọn môn học khác', en: 'Try a different keyword or course filter' },

  // Quizzes
  'quiz.title': { vi: 'Quiz', en: 'Quizzes' },
  'quiz.createNew': { vi: 'Tạo Quiz mới', en: 'Create New Quiz' },
  'quiz.teacherDesc': { vi: 'Tạo và quản lý bài kiểm tra', en: 'Create and manage quizzes' },
  'quiz.studentDesc': { vi: 'Ôn tập và kiểm tra kiến thức', en: 'Review and test your knowledge' },
  'quiz.aiCreate': { vi: 'Tạo Quiz bằng AI', en: 'Create Quiz with AI' },
  'quiz.aiDesc': { vi: 'Yêu cầu AI tạo câu hỏi ôn tập từ tài liệu môn học', en: 'Ask AI to generate review questions from course documents' },
  'quiz.tryNow': { vi: 'Thử ngay', en: 'Try Now' },
  'quiz.list': { vi: 'Danh sách Quiz', en: 'Quiz List' },
  'quiz.history': { vi: 'Lịch sử làm bài', en: 'History' },
  'quiz.stats': { vi: 'Thống kê', en: 'Statistics' },
  'quiz.questions': { vi: 'câu', en: 'questions' },

  // Users
  'users.title': { vi: 'Người dùng', en: 'Users' },
  'users.subtitle': { vi: 'Quản lý tài khoản người dùng', en: 'Manage user accounts' },

  // Settings
  'settings.title': { vi: 'Cài đặt hệ thống', en: 'System Settings' },
  'settings.subtitle': { vi: 'Cấu hình và tùy chỉnh hệ thống EduAssist', en: 'Configure and customize EduAssist' },
  'settings.general': { vi: 'Chung', en: 'General' },
  'settings.llm': { vi: 'LLM', en: 'LLM' },
  'settings.rag': { vi: 'RAG', en: 'RAG' },
  'settings.notifications': { vi: 'Thông báo', en: 'Notifications' },
  'settings.security': { vi: 'Bảo mật', en: 'Security' },
  'settings.appearance': { vi: 'Giao diện', en: 'Appearance' },
  'settings.language': { vi: 'Ngôn ngữ', en: 'Language' },
  'settings.theme': { vi: 'Giao diện', en: 'Theme' },
  'settings.themeLight': { vi: 'Sáng', en: 'Light' },
  'settings.themeDark': { vi: 'Tối', en: 'Dark' },
  'settings.langVi': { vi: 'Tiếng Việt', en: 'Vietnamese' },
  'settings.langEn': { vi: 'English', en: 'English' },

  // Profile
  'profile.title': { vi: 'Tài khoản', en: 'Account' },
  'profile.subtitle': { vi: 'Quản lý thông tin cá nhân và cài đặt', en: 'Manage personal information and settings' },
  'profile.info': { vi: 'Hồ sơ', en: 'Profile' },
  'profile.notifications': { vi: 'Thông báo', en: 'Notifications' },
  'profile.activity': { vi: 'Hoạt động', en: 'Activity' },
  'profile.personalInfo': { vi: 'Thông tin cá nhân', en: 'Personal Information' },
  'profile.fullName': { vi: 'Họ và tên', en: 'Full Name' },
  'profile.email': { vi: 'Email', en: 'Email' },
  'profile.emailNote': { vi: 'Email liên kết với Google không thể thay đổi', en: 'Google-linked email cannot be changed' },
  'profile.darkMode': { vi: 'Chế độ tối', en: 'Dark Mode' },
  'profile.darkModeDesc': { vi: 'Chuyển đổi giữa giao diện sáng và tối', en: 'Switch between light and dark theme' },
  'profile.activityStats': { vi: 'Thống kê hoạt động', en: 'Activity Statistics' },
  'profile.courses': { vi: 'Môn học', en: 'Courses' },
  'profile.aiQuestions': { vi: 'Câu hỏi AI', en: 'AI Questions' },
  'profile.quizCompleted': { vi: 'Quiz hoàn thành', en: 'Quiz Completed' },
  'profile.studyTime': { vi: 'Thời gian học', en: 'Study Time' },
  'profile.notifSettings': { vi: 'Cài đặt thông báo', en: 'Notification Settings' },
  'profile.notifDesc': { vi: 'Chọn loại thông báo bạn muốn nhận', en: 'Choose which notifications to receive' },
  'profile.emailNotif': { vi: 'Thông báo Email', en: 'Email Notifications' },
  'profile.emailNotifDesc': { vi: 'Nhận thông báo quan trọng qua email', en: 'Receive important notifications via email' },
  'profile.quizReminder': { vi: 'Nhắc nhở Quiz', en: 'Quiz Reminders' },
  'profile.quizReminderDesc': { vi: 'Nhận thông báo khi có quiz mới hoặc sắp hết hạn', en: 'Get notified about new or expiring quizzes' },
  'profile.activityLog': { vi: 'Nhật ký hoạt động', en: 'Activity Log' },
  'profile.activityLogDesc': { vi: 'Lịch sử hoạt động gần đây', en: 'Recent activity history' },
  'profile.joinedAt': { vi: 'Tham gia từ', en: 'Joined' },
  'profile.language': { vi: 'Ngôn ngữ', en: 'Language' },
  'profile.languageDesc': { vi: 'Chọn ngôn ngữ hiển thị', en: 'Choose display language' },

  // TopHeader breadcrumbs
  'breadcrumb.dashboard': { vi: 'Dashboard', en: 'Dashboard' },
  'breadcrumb.courses': { vi: 'Môn học', en: 'Courses' },
  'breadcrumb.chat': { vi: 'Chat AI', en: 'AI Chat' },
  'breadcrumb.documents': { vi: 'Tài liệu', en: 'Documents' },
  'breadcrumb.quizzes': { vi: 'Quiz', en: 'Quizzes' },
  'breadcrumb.users': { vi: 'Người dùng', en: 'Users' },
  'breadcrumb.settings': { vi: 'Cài đặt', en: 'Settings' },
  'breadcrumb.profile': { vi: 'Tài khoản', en: 'Account' },

  // Notifications
  'notif.title': { vi: 'Thông báo', en: 'Notifications' },
  'notif.viewAll': { vi: 'Xem tất cả thông báo', en: 'View all notifications' },

  // Login
  'login.welcome': { vi: 'Chào mừng đến với', en: 'Welcome to' },
  'login.subtitle': { vi: 'Trợ lý Học tập AI thông minh', en: 'Smart AI Learning Assistant' },
  'login.selectRole': { vi: 'Chọn vai trò để trải nghiệm', en: 'Select a role to explore' },

  // Toast messages
  'toast.saved': { vi: 'Đã lưu', en: 'Saved' },
  'toast.deleted': { vi: 'Đã xóa', en: 'Deleted' },
  'toast.updated': { vi: 'Đã cập nhật', en: 'Updated' },
  'toast.copied': { vi: 'Đã sao chép', en: 'Copied' },
  'toast.created': { vi: 'Đã tạo', en: 'Created' },
  'toast.uploaded': { vi: 'Đã tải lên', en: 'Uploaded' },
  'toast.downloading': { vi: 'Đang tải xuống', en: 'Downloading' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('eduassist-lang');
    return (stored as Language) || 'vi';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('eduassist-lang', lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
