-- =============================================================
-- Seed script: chạy tự động khi MySQL container khởi tạo lần đầu
-- (được mount vào /docker-entrypoint-initdb.d/)
-- =============================================================

-- Đợi database chatbox được tạo bởi MYSQL_DATABASE env var
USE chatbox;

-- ─── 1. Tạo bảng users (nếu chưa có) ─────────────────
--     Bảng này thường do SQLAlchemy tạo, nhưng init script
--     chạy TRƯỚC backend, nên ta tạo trước ở đây.
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(120) NOT NULL UNIQUE,
    full_name   VARCHAR(150),
    avatar_url  VARCHAR(500),
    google_id   VARCHAR(100) UNIQUE,
    role        ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. Tạo bảng courses (nếu chưa có) ───────────────
CREATE TABLE IF NOT EXISTS courses (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    semester    VARCHAR(20),
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. Tạo bảng enrollments (nếu chưa có) ───────────
CREATE TABLE IF NOT EXISTS enrollments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    course_id   INT NOT NULL,
    role        ENUM('teacher','student') NOT NULL DEFAULT 'student',
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_course (user_id, course_id),
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. Insert tài khoản demo ─────────────────────────
INSERT INTO users (email, full_name, role, is_active) VALUES
    ('demo.chatbot.admin@gmail.com',   'Demo Admin',   'admin',   1),
    ('demo.chatbot.teacher@gmail.com', 'Demo Teacher', 'teacher', 1),
    ('demo.chatbot.student@gmail.com', 'Demo Student', 'student', 1)
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    role      = VALUES(role),
    is_active = VALUES(is_active);

-- ─── 5. Insert môn học demo ───────────────────────────
INSERT INTO courses (code, name, description, semester, is_active) VALUES
    ('Thedepzai', 'Machine learning', 'Mon demo de test chatbot RAG', '2025-2026', 1)
ON DUPLICATE KEY UPDATE
    name        = VALUES(name),
    description = VALUES(description),
    semester    = VALUES(semester),
    is_active   = VALUES(is_active);

-- ─── 6. Gán tài khoản vào môn học ────────────────────
-- Teacher enrollment
INSERT INTO enrollments (user_id, course_id, role)
SELECT u.id, c.id, 'teacher'
FROM users u JOIN courses c ON c.code = 'Thedepzai'
WHERE u.email = 'demo.chatbot.teacher@gmail.com'
ON DUPLICATE KEY UPDATE role = VALUES(role);

-- Student enrollment
INSERT INTO enrollments (user_id, course_id, role)
SELECT u.id, c.id, 'student'
FROM users u JOIN courses c ON c.code = 'Thedepzai'
WHERE u.email = 'demo.chatbot.student@gmail.com'
ON DUPLICATE KEY UPDATE role = VALUES(role);

-- ✅ Done: 3 accounts + 1 course + 2 enrollments seeded.
