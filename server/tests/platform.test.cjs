const { directory } = require('./setup.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { rmSync } = require('node:fs');
const jwt = require('jsonwebtoken');
const database = require('../db/database');
const providers = require('../utils/aiProviders');
let aiResponse = 'A valid lesson plan';
providers.chatWithAI = async () => { if (aiResponse instanceof Error) throw aiResponse; return aiResponse; };
providers.getAvailableProviders = () => ({ primary: 'none' });
const app = require('../index');
let server, base, teacher, other, classId, studentToken, studentId, quizId, assignmentId, lessonId;

async function request(path, token, method = 'GET', body) {
    const response = await fetch(base + path, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
}
before(async () => {
    await app.ready();
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.on('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
    await new Promise(resolve => server.close(resolve));
    (await database.getDatabase()).close();
    rmSync(directory, { recursive: true, force: true });
});

test('registration grants exactly five credits and rejects invalid input', async () => {
    const invalid = await request('/auth/register', null, 'POST', { name: '', email: 'bad', password: 'x' });
    assert.equal(invalid.status, 400);
    for (const email of ['teacher@test.example', 'other@test.example']) {
        const response = await request('/auth/register', null, 'POST', { name: 'Test Teacher', email, password: 'Testing12345' });
        assert.equal(response.status, 201, JSON.stringify(response.body));
        assert.equal(response.body.user.credits, 5);
        if (!teacher) teacher = response.body; else other = response.body;
    }
    const me = await request('/auth/me', teacher.token);
    assert.equal(me.body.user.creditCosts.open_lesson, 2);
    assert.equal((await database.getOne('SELECT COUNT(*) AS count FROM users')).count, 2);
});

test('classes require authentication and isolate teachers and student secrets', async () => {
    const response = await request('/classes', teacher.token, 'POST', { name: '8A', subject: 'Math', grade: 8 });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    classId = response.body.id;
    await database.runQuery('UPDATE classes SET telegram_invite_code = ? WHERE id = ?', ['TEST-CLASS', classId]);
    assert.equal((await request(`/classes/${classId}`)).status, 401);
    for (const [method, path, body] of [
        ['GET', `/classes/${classId}`], ['GET', `/classes/${classId}/students`],
        ['POST', `/classes/${classId}/students`, { name: 'Intruder' }],
        ['PUT', `/classes/${classId}`, { name: 'Intruder' }], ['DELETE', `/classes/${classId}`],
    ]) assert.equal((await request(path, other.token, method, body)).status, 404);
    const registration = await request('/student/register', null, 'POST', { invite_code: 'TEST-CLASS', name: 'Test Student', username: 'student1', password: 'Testing12345' });
    assert.equal(registration.status, 201);
    const login = await request('/student/login', null, 'POST', { username: 'student1', password: 'Testing12345' });
    assert.equal(login.status, 200);
    studentToken = login.body.token;
    studentId = login.body.student.id;
    assert.equal((await request('/classes', studentToken)).status, 403);
    const students = await request(`/classes/${classId}/students`, teacher.token);
    assert.equal(students.body[0].name, 'Test Student');
    assert.ok(!Object.hasOwn(students.body[0], 'password_hash'));
    const dashboard = await request('/student-portal/dashboard', studentToken);
    assert.ok(!Object.hasOwn(dashboard.body.student, 'password_hash'));
});

test('lessons retain slides, previews, attachments, and access rules', async () => {
    const preview = 'data:image/jpeg;base64,/9j/2Q==';
    const response = await request('/lessons', teacher.token, 'POST', { title: 'Saved lesson', thumbnail_url: preview, slides_json: [{ type: 'cover', title: 'Hello' }], theme: 'light' });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    lessonId = response.body.id;
    assert.equal((await request(`/lessons/${lessonId}`, teacher.token)).body.thumbnail_url, preview);
    assert.equal((await request(`/lessons/${lessonId}`, other.token)).status, 403);
    const file = await request('/lesson-files', teacher.token, 'POST', { lesson_id: lessonId, file_url: preview, file_name: 'preview.jpg', file_type: 'image' });
    assert.equal(file.status, 201);
    assert.ok(file.body.id > 0);
    assert.equal((await request(`/lessons/${lessonId}`, teacher.token)).body.files.length, 1);
    assert.equal((await request('/cloudinary/signature', teacher.token)).status, 503);
    assert.equal((await request('/cloudinary/signature')).status, 401);
});

test('AI charges the last credit correctly and refunds a provider failure', async () => {
    await database.runQuery('UPDATE users SET credits = 2 WHERE id = ?', [teacher.user.id]);
    aiResponse = 'A valid lesson plan';
    const response = await request('/ai/lesson-plan', teacher.token, 'POST', { topic: 'Equations', subject: 'Math' });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.creditsRemaining, 0);
    assert.equal((await request('/ai/lesson-plan', teacher.token, 'POST', { topic: 'Equations', subject: 'Math' })).status, 403);
    await database.runQuery('UPDATE users SET credits = 2 WHERE id = ?', [teacher.user.id]);
    aiResponse = new Error('Provider unavailable');
    assert.equal((await request('/ai/lesson-plan', teacher.token, 'POST', { topic: 'Equations', subject: 'Math' })).status, 500);
    assert.equal((await database.getOne('SELECT credits FROM users WHERE id = ?', [teacher.user.id])).credits, 2);
    aiResponse = 'A valid lesson plan';
    const { deductAICredits } = require('../middleware/planMiddleware');
    const debits = await Promise.all([deductAICredits(teacher.user.id, 2), deductAICredits(teacher.user.id, 2)]);
    assert.equal(debits.filter(Boolean).length, 1);
    assert.equal((await database.getOne('SELECT credits FROM users WHERE id = ?', [teacher.user.id])).credits, 0);
});

test('homework is saved for manual review without invented grades or charges', async () => {
    const assignment = await request('/assignments', teacher.token, 'POST', { title: 'Homework task', class_id: classId, instructions: 'Solve and explain', answer_key: '4', max_score: 10 });
    assert.equal(assignment.status, 201, JSON.stringify(assignment.body));
    assignmentId = assignment.body.id;
    const response = await request(`/student-portal/assignments/${assignmentId}/submit`, studentToken, 'POST', { answer_text: 'My solution is four, with explanation.', language: 'ru' });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.status, 'pending');
    assert.equal(response.body.score, null);
    assert.equal(response.body.creditsCharged, 0);
    const reviews = await request(`/assignments/${assignmentId}/submissions`, teacher.token);
    assert.equal(reviews.body.submissions.length, 1);
    const sub = reviews.body.submissions[0];
    assert.equal((await request(`/assignments/${assignmentId}/submissions`, other.token)).status, 404);
    const graded = await request(`/assignments/${assignmentId}/submissions/${sub.id}`, teacher.token, 'PATCH', { score: 8, feedback: 'Good explanation' });
    assert.equal(graded.status, 200);
    const result = await request(`/student-portal/assignments/${assignmentId}`, studentToken);
    assert.equal(result.body.score, 8);
    assert.equal(result.body.status, 'graded');
    assert.ok(!Object.hasOwn(result.body, 'answer_key'));
});

test('quiz submission validates class membership, scores on server, and awards XP once', async () => {
    const quiz = await request('/quizzes', teacher.token, 'POST', { title: 'Test quiz', questions: [{ question: '2 + 2?', options: ['A) 4', 'B) 5'], correct: 'A' }] });
    assert.equal(quiz.status, 201);
    quizId = quiz.body.id;
    assert.equal((await request(`/quizzes/${quizId}`, other.token)).status, 404);
    assert.equal((await request(`/student-portal/quizzes/${quizId}/submit`, studentToken, 'POST', { answers: ['A'] })).status, 404);
    assert.equal((await request(`/quizzes/${quizId}/assign`, teacher.token, 'POST', { class_id: classId })).status, 200);
    const available = await request(`/student-portal/quizzes/${quizId}`, studentToken);
    assert.ok(!Object.hasOwn(available.body.questions[0], 'correct'));
    const responses = await Promise.all([1, 2].map(() => request(`/student-portal/quizzes/${quizId}/submit`, studentToken, 'POST', { answers: ['A'], score: 999 })));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    assert.equal(responses.find(r => r.status === 200).body.score, 1);
    assert.equal((await database.getOne('SELECT xp FROM students WHERE id = ?', [studentId])).xp, 110);
});

test('marketplace purchases transfer tokens atomically and unlock the purchased lesson', async () => {
    await database.runQuery('UPDATE users SET token_balance = 30 WHERE id = ?', [other.user.id]);
    await database.runQuery('UPDATE lessons SET is_published = 1, for_sale = 1, price_tokens = 20 WHERE id = ?', [lessonId]);
    const responses = await Promise.all([1, 2].map(() => request(`/marketplace/buy/${lessonId}`, other.token, 'POST', {})));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
    assert.equal((await database.getOne('SELECT token_balance FROM users WHERE id = ?', [other.user.id])).token_balance, 10);
    assert.equal((await request(`/lessons/${lessonId}`, other.token)).status, 200);
    assert.equal((await request(`/lessons/${lessonId}/slides`, other.token)).status, 200);
});

test('main teacher API views return JSON and unavailable payments cannot grant a plan', async () => {
    for (const path of ['/dashboard/stats', '/dashboard/upcoming-lessons', '/notifications', '/reports', '/lessons/public', '/lessons/saved', '/open-lessons', '/integrations', '/chat/conversations', '/chat/unread', '/schedule', '/schedule/today', '/marketplace', '/marketplace/my', '/marketplace/tokens', '/auth/teacher-profile', '/auth/leaderboard']) {
        const result = await request(path, teacher.token);
        assert.equal(result.status, 200, `${path}: ${JSON.stringify(result.body)}`);
    }
    assert.equal((await request('/admin/stats', teacher.token)).status, 403);
    assert.equal((await request('/kaspi/create-order', teacher.token, 'POST', { planId: 'pro' })).status, 503);
    assert.equal((await request('/kaspi/webhook', null, 'POST', { orderId: 'fake', status: 'paid' })).status, 401);
    assert.equal((await request('/does-not-exist')).status, 404);
});

test('live lessons and parent links check ownership and do not reveal poll answers', async () => {
    assert.equal((await request('/live/start', other.token, 'POST', { lesson_id: lessonId })).status, 404);
    const live = await request('/live/start', teacher.token, 'POST', { lesson_id: lessonId });
    assert.equal(live.status, 201);
    const code = live.body.code;
    assert.equal((await request(`/live/${code}/slide`, teacher.token, 'PATCH', { slide_index: 0, active_poll: { question: '2+2?', options: ['4', '5'], correct: 'A' } })).status, 200);
    const publicSession = await request(`/live/${code}`);
    assert.ok(!Object.hasOwn(publicSession.body.active_poll, 'correct'));
    assert.equal((await request(`/live/${code}`, other.token, 'DELETE')).status, 404);
    assert.equal((await request(`/live/${code}`)).body.status, 'active');
    assert.equal((await request(`/parent/generate/${studentId}`, other.token, 'POST', {})).status, 404);
    const parent = await request(`/parent/generate/${studentId}`, teacher.token, 'POST', {});
    assert.equal(parent.status, 200);
    assert.equal((await request(`/parent/${parent.body.token}`)).status, 200);
    await request(`/parent/revoke/${studentId}`, teacher.token, 'DELETE');
    assert.equal((await request(`/parent/${parent.body.token}`)).status, 404);
});

test('ad rewards require a completed signed view and cannot be claimed twice', async () => {
    const inserted = await database.runQuery("INSERT INTO ads (title, url, duration, tokens_reward) VALUES ('Test ad', 'https://example.com/ad', 600, 5)");
    const adId = Number(inserted.lastInsertRowid);
    const ad = await request('/admin/ads/current', teacher.token);
    assert.equal((await request(`/admin/ads/${adId}/view`, teacher.token, 'POST', { viewToken: ad.body.viewToken })).status, 425);
    assert.equal((await request('/marketplace/earn', teacher.token, 'POST', {})).status, 400);
    const ticket = jwt.sign({ adId, userId: teacher.user.id, purpose: 'ad-view' }, process.env.JWT_SECRET, { expiresIn: '1m', jwtid: 'test-view-once' });
    const result = await Promise.all([1, 2].map(() => request(`/admin/ads/${adId}/view`, teacher.token, 'POST', { viewToken: ticket })));
    assert.deepEqual(result.map(item => item.status).sort(), [200, 409]);
});

test('blocked accounts and invalid tokens are rejected', async () => {
    const invalid = jwt.sign({ userId: teacher.user.id, role: 'teacher' }, 'wrong-secret');
    assert.equal((await request('/classes', invalid)).status, 401);
    await database.runQuery('UPDATE users SET is_active = 0 WHERE id = ?', [other.user.id]);
    assert.equal((await request('/classes', other.token)).status, 401);
});
