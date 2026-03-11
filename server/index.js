require('dotenv').config();
const express = require('express');
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
    process.env.FRONTEND_URL,
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


    // Import routes after database is ready
    const lessonsRouter = require('./routes/lessons');
    const assignmentsRouter = require('./routes/assignments');
    const classesRouter = require('./routes/classes');
    const authRouter = require('./routes/auth');
    const dashboardRouter = require('./routes/dashboard');
    const notificationsRouter = require('./routes/notifications');
    const aiRouter = require('./routes/ai');
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
  ║     TeachFlow API Server v1.0          ║
  ╠════════════════════════════════════════╣
  ║  🚀 Server running on port ${PORT}         ║
  ║  📚 API: http://localhost:${PORT}/api     ║
  ╚════════════════════════════════════════╝
    `);
    });
}

startServer().catch(console.error);

module.exports = app;
