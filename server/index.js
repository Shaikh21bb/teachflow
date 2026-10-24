require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { getDatabase, getOne, getAll, runQuery, withTransaction, SCHEMA_VERSION } = require('./db/database');
const { authLimiter, aiLimiter, generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

// ──────────────────────────────────────────
// Middleware — ORDER MATTERS
// ──────────────────────────────────────────
// 1. Compression (must be first to compress all responses)
app.use(compression({ level: 6, threshold: 1024 }));

// 2. Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// 3. Logging (use 'combined' in production — 'dev' is too slow)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 4. CORS
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
            /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
            origin.endsWith('.vercel.app') ||
            origin === 'https://urpaq.ai' ||
            origin === 'https://www.urpaq.ai' ||
            (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
        ) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// 5. Rate limiting BEFORE body parsing (reject abusers early)
app.use('/api/', (req, res, next) => /^\/(games|student-quests)(\/|$)/.test(req.path) ? next() : generalLimiter(req, res, next));

// 6. Body parsing
app.use('/api/games', express.json({ limit: '64kb' }));
app.use('/api/student-quests', express.json({ limit: '4kb' }));
app.use(express.json({ limit: '2mb' }));

// ──────────────────────────────────────────
// Run additive migrations (safe to re-run)
// ──────────────────────────────────────────
async function runMigrations() {
    if (await getOne('SELECT version FROM app_schema_versions WHERE version = ?', [SCHEMA_VERSION])) return;
    const migrations = [
        // v1 columns
        `ALTER TABLE users ADD COLUMN subjects TEXT DEFAULT '[]'`,
        `ALTER TABLE users ADD COLUMN avatar_url TEXT`,
        // v2 lesson columns
        `ALTER TABLE lessons ADD COLUMN thumbnail_url TEXT`,
        `ALTER TABLE lessons ADD COLUMN thumbnail_public_id TEXT`,
        `ALTER TABLE lessons ADD COLUMN thumbnail_asset_owner_id INTEGER`,
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
            asset_owner_id INTEGER,
            order_index INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
        )`,
        `ALTER TABLE lesson_files ADD COLUMN asset_owner_id INTEGER`,
        `CREATE TABLE IF NOT EXISTS cloudinary_cleanup_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id TEXT NOT NULL,
            resource_type TEXT NOT NULL DEFAULT 'raw',
            asset_owner_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            next_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(public_id, resource_type)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_cloudinary_cleanup_due
            ON cloudinary_cleanup_jobs(status, next_attempt_at)`,
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
        // v15 - Token economy + Marketplace
        `ALTER TABLE users ADD COLUMN token_balance INTEGER DEFAULT 0`,
        `CREATE TABLE IF NOT EXISTS token_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            ref_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_token_tx_user ON token_transactions(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_token_tx_type ON token_transactions(type)`,
        `ALTER TABLE lessons ADD COLUMN price_tokens INTEGER DEFAULT 0`,
        `ALTER TABLE lessons ADD COLUMN for_sale INTEGER DEFAULT 0`,
        `CREATE TABLE IF NOT EXISTS marketplace_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            buyer_id INTEGER NOT NULL,
            seller_id INTEGER NOT NULL,
            lesson_id INTEGER NOT NULL,
            tokens_paid INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(buyer_id, lesson_id),
            FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_mp_buyer ON marketplace_purchases(buyer_id)`,
        `CREATE INDEX IF NOT EXISTS idx_mp_lesson ON marketplace_purchases(lesson_id)`,
        // v16 - Lesson schedule
        `CREATE TABLE IF NOT EXISTS lesson_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            lesson_id INTEGER,
            title TEXT NOT NULL,
            subject TEXT,
            class_name TEXT,
            day_of_week INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            duration INTEGER DEFAULT 45,
            color TEXT DEFAULT '#6366f1',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_schedule_user ON lesson_schedule(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_schedule_day ON lesson_schedule(user_id, day_of_week)`,
        // v17 - Ads system + admin role
        `ALTER TABLE users ADD COLUMN role_admin INTEGER DEFAULT 0`,
        `CREATE TABLE IF NOT EXISTS ads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'video',
            url TEXT NOT NULL,
            thumbnail_url TEXT,
            duration INTEGER DEFAULT 15,
            tokens_reward INTEGER DEFAULT 5,
            link_url TEXT,
            is_active INTEGER DEFAULT 1,
            views_count INTEGER DEFAULT 0,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(is_active)`,
        `CREATE TABLE IF NOT EXISTS ad_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            ad_id INTEGER NOT NULL,
            viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            tokens_earned INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_ad_views_user ON ad_views(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_ad_views_ad ON ad_views(ad_id)`,
        `ALTER TABLE ad_views ADD COLUMN claim_token TEXT`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_views_claim ON ad_views(claim_token) WHERE claim_token IS NOT NULL`,
        // v18 - Performance indexes
        `CREATE INDEX IF NOT EXISTS idx_lessons_pub_views ON lessons(is_published, is_archived, views_count)`,
        `CREATE INDEX IF NOT EXISTS idx_lessons_pub_likes ON lessons(is_published, is_archived, likes)`,
        `CREATE INDEX IF NOT EXISTS idx_lessons_user_pub ON lessons(user_id, is_published, is_archived)`,
        `CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id)`,
        `CREATE INDEX IF NOT EXISTS idx_saved_materials_user_type ON saved_materials(user_id, type)`,
        `CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON assignments(user_id, status)`,
        `CREATE INDEX IF NOT EXISTS idx_token_tx_user_date ON token_transactions(user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_ad_views_user_date ON ad_views(user_id, viewed_at)`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)`,
        `CREATE TABLE IF NOT EXISTS game_rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE,
            teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'arena', play_mode TEXT NOT NULL DEFAULT 'multiplayer', language TEXT NOT NULL DEFAULT 'kk', questions TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'lobby', round_index INTEGER NOT NULL DEFAULT 0,
            round_seconds INTEGER NOT NULL DEFAULT 30, deadline INTEGER, remaining_ms INTEGER,
            cyan_health INTEGER NOT NULL DEFAULT 10000, coral_health INTEGER NOT NULL DEFAULT 10000,
            revision INTEGER NOT NULL DEFAULT 0, last_event TEXT, events TEXT NOT NULL DEFAULT '[]', winner INTEGER,
            request_key TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at INTEGER NOT NULL,
            ended_at TEXT, UNIQUE(teacher_id, request_key)
        )`,
        `ALTER TABLE game_rooms ADD COLUMN mode TEXT NOT NULL DEFAULT 'arena'`,
        `ALTER TABLE game_rooms ADD COLUMN play_mode TEXT NOT NULL DEFAULT 'multiplayer'`,
        `CREATE INDEX IF NOT EXISTS idx_game_rooms_teacher ON game_rooms(teacher_id, id)`,
        `CREATE TABLE IF NOT EXISTS game_players (
            id TEXT PRIMARY KEY, room_id INTEGER NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
            client_key TEXT NOT NULL, name TEXT NOT NULL, team INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1,
            score INTEGER NOT NULL DEFAULT 0, correct_count INTEGER NOT NULL DEFAULT 0,
            answer_count INTEGER NOT NULL DEFAULT 0, hits INTEGER NOT NULL DEFAULT 0,
            last_round INTEGER NOT NULL DEFAULT -1, last_answer INTEGER, last_correct INTEGER,
            attack_ready INTEGER NOT NULL DEFAULT 0, UNIQUE(room_id, client_key)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_game_players_room ON game_players(room_id)`,
        `CREATE TABLE IF NOT EXISTS game_answers (
            room_id INTEGER NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
            player_id TEXT NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
            round_index INTEGER NOT NULL, answer_index INTEGER NOT NULL, is_correct INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(room_id, player_id, round_index)
        )`,
        `CREATE TABLE IF NOT EXISTS quest_progress (
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            quest_id TEXT NOT NULL, current_index INTEGER NOT NULL DEFAULT 0,
            completed_at TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(student_id, quest_id)
        )`,
        `CREATE TABLE IF NOT EXISTS quest_step_results (
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            quest_id TEXT NOT NULL, step_index INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0, completed_at TEXT,
            PRIMARY KEY(student_id, quest_id, step_index)
        )`,
        `CREATE TABLE IF NOT EXISTS quest_assignments (
            class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            quest_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(class_id, quest_id)
        )`,
        `CREATE TRIGGER IF NOT EXISTS keep_student_accounts_on_class_delete
         BEFORE DELETE ON classes BEGIN
             UPDATE students SET class_id = NULL WHERE class_id = OLD.id AND password_hash IS NOT NULL;
         END`,
    ];

    for (const sql of migrations) {
        try {
            await runQuery(sql);
        } catch (e) {
            // Silently ignore "already exists" / "duplicate column" errors
            if (!e.message?.toLowerCase().includes('already exists') &&
                !e.message?.toLowerCase().includes('duplicate column')) {
                throw e;
            }
        }
    }
    // Dedupe and enforce uniqueness under one write lock so an older rolling-deploy
    // instance cannot insert another duplicate between the two statements.
    await withTransaction(async transaction => {
        // Only backfill provenance when the historical public_id already proves
        // that it lives in the lesson owner's signed upload folder.
        await transaction.execute(`UPDATE lesson_files
            SET asset_owner_id = (
                SELECT lessons.user_id FROM lessons WHERE lessons.id = lesson_files.lesson_id
            )
            WHERE asset_owner_id IS NULL
              AND public_id IS NOT NULL
              AND public_id LIKE 'urpaq-lessons/' || (
                  SELECT lessons.user_id FROM lessons WHERE lessons.id = lesson_files.lesson_id
              ) || '/%'`);
        await transaction.execute(`DELETE FROM saved_materials
            WHERE lesson_id IS NOT NULL
              AND id NOT IN (
                  SELECT MIN(id)
                  FROM saved_materials
                  WHERE lesson_id IS NOT NULL
                  GROUP BY user_id, lesson_id
              )`);
        await transaction.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_materials_user_lesson_unique
            ON saved_materials(user_id, lesson_id)
            WHERE lesson_id IS NOT NULL`);
    });
    await runQuery('INSERT OR IGNORE INTO app_schema_versions (version) VALUES (?)', [SCHEMA_VERSION]);
    console.log('✅ Migrations complete');
}

// ──────────────────────────────────────────
// Seed admin accounts (runs on every start, idempotent)
// Reads credentials from environment variables
// ──────────────────────────────────────────
async function seedAdmins() {
    const bcrypt = require('bcryptjs');
    const { getOne: _getOne, runQuery: _runQuery } = require('./db/database');

    // Administrator bootstrap is explicitly configured by the deployment owner.
    const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH;
    const emails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    if (!ADMIN_HASH || emails.length === 0) return;

    const admins = emails.map(email => ({ email, name: 'Administrator' }));

    for (const admin of admins) {
        try {
            const existing = await _getOne(
                'SELECT id, role_admin FROM users WHERE email = ?',
                [admin.email]
            );

            if (existing) {
                await _runQuery(
                    "UPDATE users SET role_admin = 1, role = 'admin' WHERE email = ?",
                    [admin.email]
                );
                console.log(`✅ Admin elevated: ${admin.email}`);
            } else {
                await _runQuery(
                    `INSERT INTO users (name, email, password_hash, role, role_admin, credits, token_balance, plan, subjects)
                     VALUES (?, ?, ?, 'admin', 1, 5, 0, 'free', '[]')`,
                    [admin.name, admin.email, ADMIN_HASH]
                );
                console.log(`✅ Admin created: ${admin.email}`);
            }
        } catch (e) {
            console.warn(`Admin seed warning for ${admin.email}:`, e.message);
        }
    }
}

// ──────────────────────────────────────────
// Start server
// ──────────────────────────────────────────
async function initializeApp() {
    await getDatabase();
    await runMigrations();
    await seedAdmins();
    require('./utils/cloudinaryCleanup').startCloudinaryCleanupWorker();

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
    const marketplaceRouter = require('./routes/marketplace');
    const scheduleRouter = require('./routes/schedule');
    const adminRouter = require('./routes/admin');

    // Initialize Google Sheets headers (optional, won't crash if unavailable)
    try {
        const { ensureSheetHeaders } = require('./utils/googleSheets');
        ensureSheetHeaders().catch(error => console.warn('Google Sheets skipped:', error.message));
    } catch (e) {
        console.log('Google Sheets skipped:', e.message);
    }

    // Helper route for secure Cloudinary signed uploads
    app.get('/api/cloudinary/signature', require('./middleware/auth').authenticateToken, (req, res) => {
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        // The user-scoped path is also the server-side provenance check used
        // before removing an uploaded asset.
        const folder = `urpaq-lessons/${req.user.userId}`;

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
    app.use('/api/auth', authRouter);
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
    app.use('/api/games', require('./routes/games'));
    app.use('/api/student-quests', require('./routes/student-quests'));
    app.use('/api/quest-classes', require('./routes/quest-classes'));
    app.use('/api/chat', chatRouter);
    app.use('/api/parent', parentRouter);
    app.use('/api/marketplace', marketplaceRouter);
    app.use('/api/schedule', scheduleRouter);
    app.use('/api/admin', adminRouter);

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', version: '2.0', revision: (process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 8), timestamp: new Date().toISOString() });
    });

    app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

    // Global Error Handler
    app.use((err, req, res, next) => {
        if (!err.status || err.status >= 500) console.error('Server Error:', err.stack);
        const status = err.status || 500;
        res.status(status).json({
            error: status === 413 ? 'Файл слишком большой. Используйте файл меньшего размера.' : status >= 500 ? 'Ошибка сервера. Повторите попытку позже.' : err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    });

    return app;
}

let readyPromise;
app.ready = () => {
    if (!readyPromise) readyPromise = initializeApp().catch(error => { readyPromise = null; throw error; });
    return readyPromise;
};

async function startServer() {
    await app.ready();
    const server = app.listen(PORT, () => {
        console.log(`🚀 Urpaq.ai API running on port ${PORT}`);
    });
    // Prevent socket hang-up behind nginx/Vercel reverse proxy
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    return server;
}

if (require.main === module) {
    startServer().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = app;
