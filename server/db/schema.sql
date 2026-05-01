-- Urpaq.ai Full Database Schema v2.0

-- ══════════════════════════════════════════
-- CORE TABLES
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'teacher',
    avatar_url TEXT,
    credits INTEGER DEFAULT 10,
    plan TEXT DEFAULT 'free',
    billing_period_start DATETIME,
    billing_period_end DATETIME,
    subjects TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
    teacher_id INTEGER PRIMARY KEY,
    bio TEXT,
    subject_expertise TEXT DEFAULT '[]',
    school TEXT,
    city TEXT,
    social_links TEXT DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════
-- LESSONS
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT,
    grade INTEGER,
    duration INTEGER DEFAULT 45,
    description TEXT,
    content TEXT,
    thumbnail_url TEXT,
    content_url TEXT,
    file_type TEXT DEFAULT 'text',
    rating REAL DEFAULT 0,
    ratings_count INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 0,
    is_archived INTEGER DEFAULT 0,
    share_token TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    file_type TEXT,
    public_id TEXT,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════
-- CATEGORIES
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS lesson_categories (
    lesson_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (lesson_id, category_id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════
-- ANALYTICS
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lesson_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    stat_date TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    avg_watch_time INTEGER DEFAULT 0,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════
-- INTEGRATIONS
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    encrypted_token TEXT,
    config TEXT DEFAULT '{}',
    chat_id TEXT,
    is_active INTEGER DEFAULT 1,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    source TEXT NOT NULL,
    event_type TEXT,
    payload TEXT,
    processed INTEGER DEFAULT 0,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ══════════════════════════════════════════
-- EXISTING TABLES (preserved)
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT,
    grade INTEGER,
    user_id INTEGER,
    telegram_invite_code TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    class_id INTEGER,
    avg_grade REAL DEFAULT 0,
    status TEXT DEFAULT 'good',
    telegram_chat_id TEXT,
    telegram_username TEXT,
    password_hash TEXT,
    username TEXT UNIQUE,
    avatar_color TEXT DEFAULT '#6366f1',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'homework',
    class_id INTEGER,
    instructions TEXT DEFAULT '',
    answer_key TEXT DEFAULT '',
    max_score INTEGER DEFAULT 100,
    due_date TEXT,
    submitted INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    answer_text TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 100,
    grade_label TEXT,
    feedback TEXT,
    mistakes TEXT DEFAULT '[]',
    status TEXT DEFAULT 'graded',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icon TEXT,
    type TEXT DEFAULT 'info',
    text TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS saved_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'lesson',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE IF NOT EXISTS open_lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT,
    grade INTEGER,
    topic TEXT,
    objectives TEXT,
    content TEXT,
    class_id INTEGER,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS lesson_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    open_lesson_id INTEGER NOT NULL,
    team_name TEXT NOT NULL,
    student_ids TEXT DEFAULT '[]',
    task TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (open_lesson_id) REFERENCES open_lessons(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════
-- QUIZ SYSTEM
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT,
    grade TEXT,
    description TEXT DEFAULT '',
    questions TEXT DEFAULT '[]',
    time_limit INTEGER,
    is_active INTEGER DEFAULT 1,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    student_id INTEGER,
    student_name TEXT NOT NULL,
    answers TEXT DEFAULT '[]',
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quiz_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    deadline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════
-- BILLING & MONETIZATION
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'KZT',
    provider TEXT DEFAULT 'kaspi',
    external_id TEXT,
    status TEXT DEFAULT 'pending',
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at);
CREATE INDEX IF NOT EXISTS idx_lessons_subject_grade ON lessons(subject, grade);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON lessons(is_published, is_archived);
CREATE INDEX IF NOT EXISTS idx_lesson_files_lesson_id ON lesson_files(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_stats_lesson_date ON lesson_stats(lesson_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_integrations_user_type ON integrations(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);

-- ══════════════════════════════════════════
-- DEFAULT CATEGORIES SEED
-- ══════════════════════════════════════════

INSERT OR IGNORE INTO categories (id, name, slug) VALUES
(1, 'Математика', 'math'),
(2, 'Физика', 'physics'),
(3, 'Химия', 'chemistry'),
(4, 'Биология', 'biology'),
(5, 'История', 'history'),
(6, 'География', 'geography'),
(7, 'Литература', 'literature'),
(8, 'Язык', 'language'),
(9, 'Информатика', 'cs'),
(10, 'Английский', 'english');
