require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { getDatabase, getOne, getAll, runQuery } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // For local dev and easy start
}));
app.use(morgan('dev'));
const allowedOrigins = [
    'http://localhost:5173',
    'https://teachflow-pi.vercel.app',
    'https://www.teachflow-pi.vercel.app',
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
app.use(express.json());

// Initialize database before starting server
async function startServer() {
    await getDatabase();

    // Migrate: add subjects column if missing (safe to run multiple times)
    try {
        await runQuery("ALTER TABLE users ADD COLUMN subjects TEXT DEFAULT '[]'");
        console.log('✅ Migrated: added subjects column');
    } catch (e) { /* Already exists */ }

    // Migrate: add open_lessons table
    try {
        await runQuery(`CREATE TABLE IF NOT EXISTS open_lessons (
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
        )`);
        console.log('✅ Migrated: open_lessons table');
    } catch (e) { console.log('open_lessons table already exists') }

    // Migrate: add lesson_teams table
    try {
        await runQuery(`CREATE TABLE IF NOT EXISTS lesson_teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            open_lesson_id INTEGER NOT NULL,
            team_name TEXT NOT NULL,
            student_ids TEXT DEFAULT '[]',
            task TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (open_lesson_id) REFERENCES open_lessons(id) ON DELETE CASCADE
        )`);
        console.log('✅ Migrated: lesson_teams table');
    } catch (e) { console.log('lesson_teams table already exists') }


    // Import routes after database is ready
    const lessonsRouter = require('./routes/lessons');
    const assignmentsRouter = require('./routes/assignments');
    const classesRouter = require('./routes/classes');
    const authRouter = require('./routes/auth');
    const dashboardRouter = require('./routes/dashboard');
    const notificationsRouter = require('./routes/notifications');
    const aiRouter = require('./routes/ai');
    const openLessonsRouter = require('./routes/open_lessons');
    const { ensureSheetHeaders } = require('./utils/googleSheets');

    // Initialize Google Sheets headers
    await ensureSheetHeaders();

    // API Routes
    app.use('/api/auth', authRouter);
    app.use('/api/lessons', lessonsRouter);
    app.use('/api/assignments', assignmentsRouter);
    app.use('/api/classes', classesRouter);
    app.use('/api/dashboard', dashboardRouter);
    app.use('/api/notifications', notificationsRouter);
    app.use('/api/ai', aiRouter);
    app.use('/api/open-lessons', openLessonsRouter);


    // Health check
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

    // Start server
    app.listen(PORT, () => {
        console.log(`
  ╔════════════════════════════════════════╗
  ║     Urpaq.ai API Server v1.0           ║
  ╠════════════════════════════════════════╣
  ║  🚀 Server running on port ${PORT}         ║
  ║  📚 API: http://localhost:${PORT}/api     ║
  ╚════════════════════════════════════════╝
    `);
    });
}

startServer().catch(console.error);

module.exports = app;
