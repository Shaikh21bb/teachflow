/**
 * Live Session routes — real-time interactive lessons
 * Uses Server-Sent Events (SSE) for push updates.
 * No external packages required.
 *
 * Tables used: live_sessions (created in v11 migration in index.js)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery, getLastInsertId } = require('../db/database');

// ── In-memory SSE client registry ────────────────────────────
// Map<sessionCode, Set<{res, studentName}>>
const sseClients = new Map();

function getClients(code) {
    if (!sseClients.has(code)) sseClients.set(code, new Set());
    return sseClients.get(code);
}

function pushToClients(code, eventName, data) {
    const clients = sseClients.get(code);
    if (!clients) return;
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
        try { client.res.write(payload); } catch { /* client disconnected */ }
    }
}

// ── Generate a random 6-char alphanumeric code ────────────────
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// ── POST /api/live/start ─────────────────────────────────────
// Teacher starts a live session. Requires auth.
router.post('/start', authenticateToken, async (req, res) => {
    try {
        const { lesson_id } = req.body;
        const teacherId = req.user.userId;

        // Generate unique code
        let code;
        let attempts = 0;
        do {
            code = generateCode();
            attempts++;
            if (attempts > 20) return res.status(500).json({ error: 'Не удалось создать код сессии' });
        } while (await getOne('SELECT id FROM live_sessions WHERE code = ? AND status = ?', [code, 'active']));

        // Close any existing active sessions for this teacher
        await runQuery(
            `UPDATE live_sessions SET status = 'ended' WHERE teacher_id = ? AND status = 'active'`,
            [teacherId]
        );

        await runQuery(
            `INSERT INTO live_sessions (code, lesson_id, teacher_id, current_slide_index, active_poll, answers, participants_count, status)
             VALUES (?, ?, ?, 0, NULL, '[]', 0, 'active')`,
            [code, lesson_id || null, teacherId]
        );

        const session = await getOne('SELECT * FROM live_sessions WHERE code = ?', [code]);
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.status(201).json({
            ...session,
            join_url: `${baseUrl}/join/${code}`,
            qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${baseUrl}/join/${code}`)}`
        });
    } catch (err) {
        console.error('Live start error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/live/:code — get session info (public) ──────────
router.get('/:code', async (req, res) => {
    try {
        const session = await getOne(
            'SELECT id, code, lesson_id, current_slide_index, active_poll, participants_count, status FROM live_sessions WHERE code = ?',
            [req.params.code.toUpperCase()]
        );
        if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
        res.json({
            ...session,
            active_poll: session.active_poll ? JSON.parse(session.active_poll) : null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/live/:code/slide — teacher changes slide ──────
router.patch('/:code/slide', authenticateToken, async (req, res) => {
    try {
        const { slide_index, active_poll } = req.body;
        const code = req.params.code.toUpperCase();
        const session = await getOne('SELECT * FROM live_sessions WHERE code = ? AND teacher_id = ?', [code, req.user.userId]);
        if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

        const pollJson = active_poll ? JSON.stringify(active_poll) : null;
        await runQuery(
            'UPDATE live_sessions SET current_slide_index = ?, active_poll = ? WHERE code = ?',
            [slide_index ?? session.current_slide_index, pollJson, code]
        );

        // Push SSE event to all connected students
        pushToClients(code, 'slide-change', {
            slide_index: slide_index ?? session.current_slide_index,
            active_poll: active_poll || null
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/live/:code/answer — student submits answer ─────
// No auth required — students join by name only
router.post('/:code/answer', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const { student_name, answer } = req.body;
        if (!student_name || !answer) return res.status(400).json({ error: 'student_name и answer обязательны' });

        const session = await getOne('SELECT * FROM live_sessions WHERE code = ? AND status = ?', [code, 'active']);
        if (!session) return res.status(404).json({ error: 'Активная сессия не найдена' });

        // Append answer to answers JSON array
        let answers = [];
        try { answers = JSON.parse(session.answers || '[]'); } catch {}
        // Prevent duplicate answers from same student for same poll
        const pollId = session.active_poll ? JSON.parse(session.active_poll)?.question : null;
        answers = answers.filter(a => !(a.student_name === student_name && a.poll_question === pollId));
        answers.push({ student_name, answer, poll_question: pollId, ts: Date.now() });

        await runQuery('UPDATE live_sessions SET answers = ? WHERE code = ?', [JSON.stringify(answers), code]);

        // Push updated stats to all clients (including teacher)
        const stats = computeStats(session.active_poll, answers);
        pushToClients(code, 'answer-update', { stats, total_answers: answers.length });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/live/:code/join — student registers name ───────
router.post('/:code/join', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const { student_name } = req.body;
        if (!student_name) return res.status(400).json({ error: 'student_name обязателен' });

        const session = await getOne(
            'SELECT id, code, current_slide_index, active_poll, status FROM live_sessions WHERE code = ?',
            [code]
        );
        if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
        if (session.status !== 'active') return res.status(410).json({ error: 'Сессия завершена' });

        // Increment participants
        await runQuery('UPDATE live_sessions SET participants_count = participants_count + 1 WHERE code = ?', [code]);

        // Notify all clients of new participant
        const updated = await getOne('SELECT participants_count FROM live_sessions WHERE code = ?', [code]);
        pushToClients(code, 'participant-joined', { student_name, participants_count: updated.participants_count });

        res.json({
            success: true,
            current_slide_index: session.current_slide_index,
            active_poll: session.active_poll ? JSON.parse(session.active_poll) : null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/live/:code/stats — current poll results ─────────
router.get('/:code/stats', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const session = await getOne('SELECT active_poll, answers, participants_count FROM live_sessions WHERE code = ?', [code]);
        if (!session) return res.status(404).json({ error: 'Сессия не найдена' });

        let answers = [];
        try { answers = JSON.parse(session.answers || '[]'); } catch {}

        const stats = computeStats(session.active_poll, answers);
        res.json({ stats, participants_count: session.participants_count, total_answers: answers.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/live/:code — teacher ends session ─────────────
router.delete('/:code', authenticateToken, async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        await runQuery(
            'UPDATE live_sessions SET status = ? WHERE code = ? AND teacher_id = ?',
            ['ended', code, req.user.userId]
        );
        // Push end event to all students
        pushToClients(code, 'session-ended', { message: 'Урок завершён. Спасибо!' });
        // Clean up SSE clients
        sseClients.delete(code);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/live/:code/events — SSE stream (no auth) ────────
// Students and teacher both connect here for real-time updates
router.get('/:code/events', async (req, res) => {
    const code = req.params.code.toUpperCase();

    // Verify session exists
    const session = await getOne('SELECT status FROM live_sessions WHERE code = ?', [code]);
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
    if (session.status === 'ended') return res.status(410).json({ error: 'Сессия завершена' });

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx compatibility
    res.flushHeaders();

    // Send initial heartbeat
    res.write(`event: connected\ndata: ${JSON.stringify({ code, ts: Date.now() })}\n\n`);

    // Register client
    const clientObj = { res, connectedAt: Date.now() };
    getClients(code).add(clientObj);

    // Keep-alive ping every 25 seconds
    const pingInterval = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { cleanup(); }
    }, 25000);

    function cleanup() {
        clearInterval(pingInterval);
        const clients = sseClients.get(code);
        if (clients) {
            clients.delete(clientObj);
            if (clients.size === 0) sseClients.delete(code);
        }
    }

    // Clean up on client disconnect
    req.on('close', cleanup);
    req.on('error', cleanup);
});

// ── Helper: compute poll answer distribution ──────────────────
function computeStats(activePollJson, answers) {
    if (!activePollJson) return null;
    let poll;
    try {
        poll = typeof activePollJson === 'string' ? JSON.parse(activePollJson) : activePollJson;
    } catch { return null; }

    const options = poll.options || ['A', 'B', 'C', 'D'];
    const counts = {};
    options.forEach(opt => {
        const label = opt.match(/^([A-D])/)?.[1] || opt;
        counts[label] = 0;
    });

    const relevant = answers.filter(a => a.poll_question === poll.question);
    relevant.forEach(a => {
        const label = (a.answer || '').toUpperCase();
        if (counts[label] !== undefined) counts[label]++;
    });

    const total = relevant.length;
    return {
        question: poll.question,
        correct: poll.correct,
        counts,
        total,
        percentages: Object.fromEntries(
            Object.entries(counts).map(([k, v]) => [k, total > 0 ? Math.round((v / total) * 100) : 0])
        )
    };
}

module.exports = router;
