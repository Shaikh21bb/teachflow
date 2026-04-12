require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { getDatabase, getOne, getAll, runQuery } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// ──────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

const allowedOrigins = [
    'http://localhost:5173',
    'https://teachflow-pi.vercel.app',
    'https://www.teachflow-pi.vercel.app',
    'https://urpaq-edu.vercel.app',
    'https://urpaq.ai',
    'https://www.urpaq.ai',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

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
        // v3 - Quiz System
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
        // Indexes
        `CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_lessons_subject_grade ON lessons(subject, grade)`,
        `CREATE INDEX IF NOT EXISTS idx_lesson_files_lesson_id ON lesson_files(lesson_id)`,
        `CREATE INDEX IF NOT EXISTS idx_integrations_user_type ON integrations(user_id, type)`,
        // Seed categories
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (1,'Математика','math')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (2,'Физика','physics')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (3,'Химия','chemistry')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (4,'Биология','biology')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (5,'История','history')`,
        `INSERT OR IGNORE INTO categories (id, name, slug) VALUES (6,'Информатика','cs')`,
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

    // Initialize Google Sheets headers (optional, won't crash if unavailable)
    try {
        const { ensureSheetHeaders } = require('./utils/googleSheets');
        await ensureSheetHeaders();
    } catch (e) {
        console.log('Google Sheets skipped:', e.message);
    }

    // Helper route for secure Cloudinary signed uploads
    app.get('/api/cloudinary/signature', (req, res) => {
        const timestamp = Math.round((new Date).getTime() / 1000);
        const apiSecret = 'LWHK6PmsuK8c7dkAtTPGcxf72pU';
        const apiKey = '278396287363825';
        const cloudName = 'dvb6l3wri';
        const folder = 'urpaq-lessons';
        
        const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const crypto = require('crypto');
        const signature = crypto.createHash('sha1').update(strToSign).digest('hex');
        
        res.json({ signature, timestamp, apiKey, cloudName, folder });
    });

    // API Routes
    app.use('/api/auth', authRouter);
    app.use('/api/lessons', lessonsRouter);
    app.use('/api/lesson-files', lessonFilesRouter);
    app.use('/api/assignments', assignmentsRouter);
    app.use('/api/classes', classesRouter);
    app.use('/api/dashboard', dashboardRouter);
    app.use('/api/notifications', notificationsRouter);
    app.use('/api/ai', aiRouter);
    app.use('/api/open-lessons', openLessonsRouter);
    app.use('/api/integrations', integrationsRouter);
    app.use('/api/webhooks', webhooksRouter);
    app.use('/api/quizzes', quizzesRouter);

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

startServer().catch(console.error);

module.exports = app;
