require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { getDatabase, getOne, getAll, runQuery } = require('./db/database');
const { authLimiter, aiLimiter, generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// ──────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

// Replaced static array with dynamic function in the cors config below

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow localhost and any vercel app subdomains
        if (
            origin.startsWith('http://localhost') || 
            origin.endsWith('.vercel.app') || 
            origin === 'https://urpaq.ai' || 
            origin === 'https://www.urpaq.ai' ||
            (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
        ) {
            callback(null, true);
        } else {
            console.log("CORS blocked origin:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// ──────────────────────────────────────────
// Global rate limiting (DDoS protection)
// ──────────────────────────────────────────
app.use('/api/', generalLimiter);

// ──────────────────────────────────────────
// Run additive migrations (safe to re-run)
// ──────────────────────────────────────────
async function runMigrations() {
    const migrations = [
        // v1 columns
        `ALTER TABLE users ADD COLUMN subjects TEXT DEFAULT '[]'`,
        `ALTER TABLE users ADD COLUMN avatar_url TEXT`,
        // v2 lesson columns
        `ALTER TABLE lessons ADD COLUMN thumbnail_url TEXT`,
        `ALTER TABLE lessons ADD COLUMN content_url TEXT`,
        `ALTER TABLE lessons ADD COLUMN file_type TEXT DEFAULT 'text'`,
        `ALTER TABLE lessons ADD COLUMN views_count INTEGER DEFAULT 0`,
        `ALTER TABLE lessons ADD COLUMN downloads_count INTEGER DEFAULT 0`,
        `ALTER TABLE lessons ADD COLUMN is_archived INTEGER DEFAULT 0`,
        `ALTER TABLE lessons ADD COLUMN share_token TEXT`,
        // v2 tables
        `CREATE TABLE IF NOT EXISTS lesson_files (
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
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            parent_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS lesson_categories (
            lesson_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            PRIMARY KEY (lesson_id, category_id)
        )`,
        `CREATE TABLE IF NOT EXISTS teacher_profiles (
            teacher_id INTEGER PRIMARY KEY,
            bio TEXT,
            subject_expertise TEXT DEFAULT '[]',
            school TEXT,
            city TEXT,
            social_links TEXT DEFAULT '{}',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS lesson_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lesson_id INTEGER NOT NULL,
            stat_date TEXT NOT NULL,
            views INTEGER DEFAULT 0,
            downloads INTEGER DEFAULT 0,
            avg_watch_time INTEGER DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS integrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            encrypted_token TEXT,
            config TEXT DEFAULT '{}',
            chat_id TEXT,
            is_active INTEGER DEFAULT 1,
            connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, type)
        )`,
        `CREATE TABLE IF NOT EXISTS webhooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            source TEXT NOT NULL,
            event_type TEXT,
            payload TEXT,
            processed INTEGER DEFAULT 0,
            received_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // v3 - Refresh Tokens
        `CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
        // v3 - Cleanup expired refresh tokens (safe, always runs)
        `DELETE FROM refresh_tokens WHERE expires_at < datetime('now')`,
        // v4 - Password Reset Tokens
        `CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)`,
        `DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')`,
        // v5 - Quiz System
        `CREATE TABLE IF NOT EXISTS quizzes (
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
        )`,
        `CREATE TABLE IF NOT EXISTS quiz_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER NOT NULL,
            student_name TEXT NOT NULL,
            answers TEXT DEFAULT '[]',
            score INTEGER DEFAULT 0,
            max_score INTEGER DEFAULT 0,
            time_spent INTEGER DEFAULT 0,
            taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id)`,
        // v6 - User Connections (colleagues/follow system)
        `CREATE TABLE IF NOT EXISTS user_connections (
            follower_id INTEGER NOT NULL,
            following_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_id, following_id),
            FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_user_connections_follower ON user_connections(follower_id)`,
        `CREATE INDEX IF NOT EXISTS idx_user_connections_following ON user_connections(following_id)`,
        // v6 - Extended teacher profile columns
        `ALTER TABLE teacher_profiles ADD COLUMN instagram_url TEXT`,
        `ALTER TABLE teacher_profiles ADD COLUMN youtube_url TEXT`,
        `ALTER TABLE teacher_profiles ADD COLUMN telegram_url TEXT`,
        `ALTER TABLE teacher_profiles ADD COLUMN website_url TEXT`,
        `ALTER TABLE teacher_profiles ADD COLUMN avatar_url TEXT`,
        // Indexes
        `CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_lessons_subject_grade ON lessons(subject, grade)`,
        `CREATE INDEX IF NOT EXISTS idx_lesson_files_lesson_id ON lesson_files(lesson_id)`,
        `CREATE INDEX IF NOT EXISTS idx_integrations_user_type ON integrations(user_id, type)`,
        // v7 - Telegram student integration
        `ALTER TABLE classes ADD COLUMN telegram_invite_code TEXT`,
        `ALTER TABLE students ADD COLUMN telegram_chat_id TEXT`,
        `ALTER TABLE students ADD COLUMN telegram_username TEXT`,
        `CREATE INDEX IF NOT EXISTS idx_classes_invite_code ON classes(telegram_invite_code)`,
        `CREATE INDEX IF NOT EXISTS idx_students_telegram ON students(telegram_chat_id)`,
        // v8 - Student Portal
        `ALTER TABLE students ADD COLUMN password_hash TEXT`,
        `ALTER TABLE students ADD COLUMN username TEXT`,
        `ALTER TABLE students ADD COLUMN avatar_color TEXT DEFAULT '#6366f1'`,
        `ALTER TABLE students ADD COLUMN xp INTEGER DEFAULT 0`,
        `ALTER TABLE students ADD COLUMN level INTEGER DEFAULT 1`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_students_username ON students(username) WHERE username IS NOT NULL`,
        `ALTER TABLE quiz_attempts ADD COLUMN student_id INTEGER REFERENCES students(id) ON DELETE SET NULL`,
        `CREATE TABLE IF NOT EXISTS quiz_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            assigned_by INTEGER NOT NULL,
            deadline TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        )`,
        // Seed categories
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (1,'Математика','math')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (2,'Физика','physics')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (3,'Химия','chemistry')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (4,'Биология','biology')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (5,'История','history')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (6,'Информатика','cs')`,
        // v9 - Monetization & Kaspi
        `ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'`,
        `ALTER TABLE users ADD COLUMN billing_period_start DATETIME`,
        `ALTER TABLE users ADD COLUMN billing_period_end DATETIME`,
        `CREATE TABLE IF NOT EXISTS transactions (
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
        )`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id)`,
        // v10 - Homework submissions and AI grading
        `ALTER TABLE assignments ADD COLUMN instructions TEXT DEFAULT ''`,
        `ALTER TABLE assignments ADD COLUMN answer_key TEXT DEFAULT ''`,
        `ALTER TABLE assignments ADD COLUMN max_score INTEGER DEFAULT 100`,
        `CREATE TABLE IF NOT EXISTS assignment_submissions (
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
        )`,
        `CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id)`,
        `CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id)`,
        // v11 - Structured slides + presentation themes
        `ALTER TABLE lessons ADD COLUMN slides_json TEXT`,
        `ALTER TABLE lessons ADD COLUMN theme TEXT DEFAULT 'dark'`,
        // v11 - Live sessions for interactive open lessons
        `CREATE TABLE IF NOT EXISTS live_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            lesson_id INTEGER,
            teacher_id INTEGER NOT NULL,
            current_slide_index INTEGER DEFAULT 0,
            active_poll TEXT,
            answers TEXT DEFAULT '[]',
            participants_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_live_sessions_code ON live_sessions(code)`,
        `CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher ON live_sessions(teacher_id)`,
        // v12 - Teacher-to-teacher chat
        `CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user1_id, user2_id),
            FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id)`,
        `CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id)`,
        `CREATE INDEX IF NOT EXISTS idx_conversations_last ON conversations(last_message_at DESC)`,
        `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`,
        `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`,
        `CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(is_read, sender_id)`,
        // v13 - Lesson likes table
        `CREATE TABLE IF NOT EXISTS lesson_likes (
            user_id INTEGER NOT NULL,
            lesson_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, lesson_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_lesson_likes_lesson ON lesson_likes(lesson_id)`,
        // v14 - Parent portal tokens
        `ALTER TABLE students ADD COLUMN parent_token TEXT`,
        `CREATE INDEX IF NOT EXISTS idx_students_parent_token ON students(parent_token) WHERE parent_token IS NOT NULL`,
    ];

    for (const sql of migrations) {
        try {
            await runQuery(sql);
        } catch (e) {
            // Silently ignore "already exists" / "duplicate column" errors
            if (!e.message?.toLowerCase().includes('already exists') &&
                !e.message?.toLowerCase().includes('duplicate column') &&
                !e.message?.toLowerCase().includes('unique constraint')) {
                console.warn('Migration warning:', e.message?.split('\n')[0]);
            }
        }
    }
    console.log('✅ Migrations complete');
}

// ──────────────────────────────────────────
// Start server
// ──────────────────────────────────────────
async function startServer() {
    await getDatabase();
    await runMigrations();

    // Import routes
    const lessonsRouter = require('./routes/lessons');
    const lessonFilesRouter = require('./routes/lesson_files');
    const assignmentsRouter = require('./routes/assignments');
    const classesRouter = require('./routes/classes');
    const authRouter = require('./routes/auth');
    const dashboardRouter = require('./routes/dashboard');
    const notificationsRouter = require('./routes/notifications');
    const aiRouter = require('./routes/ai');
    const openLessonsRouter = require('./routes/open_lessons');
    const integrationsRouter = require('./routes/integrations');
    const webhooksRouter = require('./routes/webhooks');
    const quizzesRouter = require('./routes/quizzes');
    const telegramRouter = require('./routes/telegram');
    const reportsRouter = require('./routes/reports');
    const studentAuthRouter = require('./routes/student-auth');
    const studentPortalRouter = require('./routes/student-portal');
    const kaspiRouter = require('./routes/kaspi');
    const liveRouter = require('./routes/live');
    const chatRouter = require('./routes/chat');
    const parentRouter = require('./routes/parent');

    // Initialize Google Sheets headers (optional, won't crash if unavailable)
    try {
        const { ensureSheetHeaders } = require('./utils/googleSheets');
        await ensureSheetHeaders();
    } catch (e) {
        console.log('Google Sheets skipped:', e.message);
    }

    // Helper route for secure Cloudinary signed uploads
    app.get('/api/cloudinary/signature', (req, res) => {
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const folder = 'urpaq-lessons';

        if (!apiSecret || !apiKey || !cloudName) {
            return res.status(503).json({ error: 'Cloudinary не настроен на сервере' });
        }

        const crypto = require('crypto');
        const timestamp = Math.round((new Date).getTime() / 1000);
        
        // Ensure parameters are sorted alphabetically for Cloudinary signature
        const params = { folder, timestamp };
        const strToSign = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&') + apiSecret;
            
        const signature = crypto.createHash('sha1').update(strToSign).digest('hex');

        res.json({ signature, timestamp, apiKey, cloudName, folder });
    });

    // API Routes
    app.use('/api/auth', authLimiter, authRouter);          // 🔒 10 req/15min per IP+email
    app.use('/api/lessons', lessonsRouter);
    app.use('/api/lesson-files', lessonFilesRouter);
    app.use('/api/assignments', assignmentsRouter);
    app.use('/api/classes', classesRouter);
    app.use('/api/dashboard', dashboardRouter);
    app.use('/api/notifications', notificationsRouter);
    app.use('/api/ai', aiLimiter, aiRouter);                // 🔒 30 req/hour per IP
    app.use('/api/open-lessons', openLessonsRouter);
    app.use('/api/integrations', integrationsRouter);
    app.use('/api/webhooks', webhooksRouter);
    app.use('/api/quizzes', quizzesRouter);
    app.use('/api/reports', reportsRouter);
    app.use('/api/telegram', telegramRouter);
    app.use('/api/webhooks/telegram', telegramRouter); // Webhook alias
    app.use('/api/student', studentAuthRouter);
    app.use('/api/student-portal', studentPortalRouter);
    app.use('/api/kaspi', kaspiRouter);
    app.use('/api/live', liveRouter);
    app.use('/api/chat', chatRouter);
    app.use('/api/parent', parentRouter);

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', version: '2.0', timestamp: new Date().toISOString() });
    });

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error('❌ Server Error:', err.stack);
        res.status(err.status || 500).json({
            error: true,
            message: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    });

    // Start
    app.listen(PORT, () => {
        console.log(`
  ╔════════════════════════════════════════╗
  ║     Urpaq.ai API Server v2.0           ║
  ╠════════════════════════════════════════╣
  ║  🚀 Server: http://localhost:${PORT}       ║
  ║  📚 API:    http://localhost:${PORT}/api   ║
  ║  🤖 AI:     /api/ai/lesson-plan        ║
  ║  🔌 Hooks:  /api/webhooks/telegram/:id ║
  ╚════════════════════════════════════════╝
    `);
    });
}

if (require.main === module) {
    startServer().catch(console.error);
}

module.exports = app;
