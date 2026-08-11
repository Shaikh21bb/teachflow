/**
 * Teacher-to-teacher Chat routes
 *
 * POST   /api/chat/conversations/:userId  — open or get conversation with a teacher
 * GET    /api/chat/conversations           — list all my conversations (with last message + unread count)
 * GET    /api/chat/conversations/:id/messages — paginated message history
 * POST   /api/chat/conversations/:id/messages — send a message
 * PUT    /api/chat/conversations/:id/read    — mark all messages as read
 * GET    /api/chat/unread                   — total unread count (for badge)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../db/database');

// ── Helper: get or create a conversation between two users ──
async function getOrCreateConversation(userA, userB) {
    // Ensure consistent ordering so (1,2) and (2,1) are the same row
    const [u1, u2] = userA < userB ? [userA, userB] : [userB, userA];

    let conv = await getOne(
        'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?',
        [u1, u2]
    );
    if (!conv) {
        await runQuery(
            'INSERT OR IGNORE INTO conversations (user1_id, user2_id) VALUES (?, ?)',
            [u1, u2]
        );
        conv = await getOne(
            'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?',
            [u1, u2]
        );
    }
    return conv;
}

// ── Helper: format conversation with partner info ───────────
async function formatConversation(conv, myId) {
    const partnerId = conv.user1_id === myId ? conv.user2_id : conv.user1_id;
    const partner = await getOne(
        `SELECT u.id, u.name, COALESCE(tp.avatar_url, u.avatar_url) as avatar_url, tp.school, tp.city
         FROM users u
         LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.id
         WHERE u.id = ?`,
        [partnerId]
    );
    const lastMsg = await getOne(
        `SELECT text, sender_id, created_at FROM messages
         WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`,
        [conv.id]
    );
    const unread = await getOne(
        `SELECT COUNT(*) as count FROM messages
         WHERE conversation_id = ? AND sender_id != ? AND is_read = 0`,
        [conv.id, myId]
    );
    return {
        id: conv.id,
        partner,
        last_message: lastMsg || null,
        unread_count: unread?.count || 0,
        last_message_at: conv.last_message_at
    };
}

// ── POST /api/chat/conversations/:userId ─────────────────────
// Open (or get) a conversation with another teacher. Returns conversation id.
router.post('/conversations/:userId', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        const targetId = parseInt(req.params.userId);
        if (!targetId || targetId === myId) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }
        const target = await getOne('SELECT id, name FROM users WHERE id = ? AND is_active = 1', [targetId]);
        if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

        const conv = await getOrCreateConversation(myId, targetId);
        const formatted = await formatConversation(
            { id: conv.id, user1_id: Math.min(myId, targetId), user2_id: Math.max(myId, targetId), last_message_at: new Date().toISOString() },
            myId
        );
        res.json({ conversation: formatted });
    } catch (err) {
        console.error('Open conversation error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/chat/conversations ───────────────────────────────
// List all my conversations, newest first
router.get('/conversations', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        const convs = await getAll(
            `SELECT * FROM conversations
             WHERE user1_id = ? OR user2_id = ?
             ORDER BY last_message_at DESC`,
            [myId, myId]
        );
        const formatted = await Promise.all(convs.map(c => formatConversation(c, myId)));
        // Only return conversations that have at least one message or were just opened
        res.json({ conversations: formatted });
    } catch (err) {
        console.error('List conversations error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/chat/conversations/:id/messages ─────────────────
// Paginated history (50 most recent, offset via ?before=messageId)
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        const convId = parseInt(req.params.id);
        const before = req.query.before ? parseInt(req.query.before) : null;

        // Verify access
        const conv = await getOne(
            'SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [convId, myId, myId]
        );
        if (!conv) return res.status(403).json({ error: 'Нет доступа к этому чату' });

        let query = 'SELECT * FROM messages WHERE conversation_id = ?';
        const params = [convId];
        if (before) {
            query += ' AND id < ?';
            params.push(before);
        }
        query += ' ORDER BY created_at DESC LIMIT 50';

        const msgs = await getAll(query, params);
        // Return in chronological order
        res.json({ messages: msgs.reverse() });
    } catch (err) {
        console.error('Get messages error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/chat/conversations/:id/messages ─────────────────
// Send a message
router.post('/conversations/:id/messages', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        const convId = parseInt(req.params.id);
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        }
        if (text.length > 4000) {
            return res.status(400).json({ error: 'Сообщение слишком длинное' });
        }

        // Verify access
        const conv = await getOne(
            'SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [convId, myId, myId]
        );
        if (!conv) return res.status(403).json({ error: 'Нет доступа к этому чату' });

        const cleanText = text.trim();
        await runQuery(
            'INSERT INTO messages (conversation_id, sender_id, text) VALUES (?, ?, ?)',
            [convId, myId, cleanText]
        );

        // Update last_message_at on conversation
        await runQuery(
            'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
            [convId]
        );

        // Fetch the just-inserted message
        const msg = await getOne(
            'SELECT * FROM messages WHERE conversation_id = ? AND sender_id = ? ORDER BY created_at DESC LIMIT 1',
            [convId, myId]
        );

        res.status(201).json({ message: msg });
    } catch (err) {
        console.error('Send message error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /api/chat/conversations/:id/read ─────────────────────
// Mark all messages from the other person as read
router.put('/conversations/:id/read', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        const convId = parseInt(req.params.id);

        const conv = await getOne(
            'SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [convId, myId, myId]
        );
        if (!conv) return res.status(403).json({ error: 'Нет доступа' });

        await runQuery(
            'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
            [convId, myId]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/chat/unread ──────────────────────────────────────
// Total unread count across all conversations (for nav badge)
router.get('/unread', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        // Get all my conversation IDs
        const convs = await getAll(
            'SELECT id FROM conversations WHERE user1_id = ? OR user2_id = ?',
            [myId, myId]
        );
        if (!convs.length) return res.json({ count: 0 });

        const ids = convs.map(c => c.id);
        const placeholders = ids.map(() => '?').join(',');
        const result = await getOne(
            `SELECT COUNT(*) as count FROM messages
             WHERE conversation_id IN (${placeholders})
             AND sender_id != ? AND is_read = 0`,
            [...ids, myId]
        );

        res.json({ count: result?.count || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
