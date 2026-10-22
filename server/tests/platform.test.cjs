const { directory } = require('./setup.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { rmSync } = require('node:fs');
const jwt = require('jsonwebtoken');
const database = require('../db/database');
const { buildDestroyPayload, isOwnedLessonAsset } = require('../utils/cloudinaryCleanup');
const providers = require('../utils/aiProviders');
let aiResponse = 'A valid lesson plan';
providers.chatWithAI = async () => { if (aiResponse instanceof Error) throw aiResponse; return aiResponse; };
providers.getAvailableProviders = () => ({ primary: 'none' });
const app = require('../index');
let server, base, teacher, other, classId, studentToken, studentId, quizId, assignmentId, lessonId;

test('Cloudinary cleanup only accepts assets from the lesson owner upload path', () => {
    assert.equal(isOwnedLessonAsset('urpaq-lessons/42/file-name', 42), true);
    assert.equal(isOwnedLessonAsset('urpaq-lessons/7/file-name', 42), false);
    assert.equal(isOwnedLessonAsset('urpaq-lessons/file-name', 42), false);
    assert.equal(isOwnedLessonAsset('urpaq-lessons/42/../7/file-name', 42), false);
    assert.equal(isOwnedLessonAsset('urpaq-lessons/42//file-name', 42), false);
    const destroyPayload = buildDestroyPayload('urpaq-lessons/42/file-name', 12345, 'secret');
    assert.equal(destroyPayload.invalidate, 'true');
    assert.equal(
        destroyPayload.signature,
        crypto.createHash('sha1')
            .update('invalidate=true&public_id=urpaq-lessons/42/file-name&timestamp=12345secret')
            .digest('hex')
    );
});

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
    const untrustedFile = await request('/lesson-files', teacher.token, 'POST', {
        lesson_id: lessonId,
        file_url: 'https://example.test/untrusted.pdf',
        file_name: 'untrusted.pdf',
        file_type: 'pdf',
        public_id: 'urpaq-lessons/someone-else/file',
    });
    assert.equal(untrustedFile.status, 400);
    assert.equal(untrustedFile.body.code, 'INVALID_ASSET_PROVENANCE');
    assert.equal((await request(`/lessons/${lessonId}`, teacher.token)).body.files.length, 1);
    assert.equal((await request(`/lesson-files/${lessonId}`, other.token)).status, 403);
    assert.equal((await request('/cloudinary/signature', teacher.token)).status, 503);
    assert.equal((await request('/cloudinary/signature')).status, 401);
});

test('concurrent lesson metadata changes keep thumbnail cleanup and like totals consistent', async () => {
    const firstThumbnail = `urpaq-lessons/${teacher.user.id}/thumbnail-a-${process.pid}`;
    const thumbnailB = `urpaq-lessons/${teacher.user.id}/thumbnail-b-${process.pid}`;
    const thumbnailC = `urpaq-lessons/${teacher.user.id}/thumbnail-c-${process.pid}`;
    const firstUpdate = await request(`/lessons/${lessonId}`, teacher.token, 'PUT', {
        thumbnail_url: 'https://example.test/thumbnail-a.jpg',
        thumbnail_public_id: firstThumbnail,
    });
    assert.equal(firstUpdate.status, 200, JSON.stringify(firstUpdate.body));

    const replacements = await Promise.all([
        request(`/lessons/${lessonId}`, teacher.token, 'PUT', {
            thumbnail_url: 'https://example.test/thumbnail-b.jpg',
            thumbnail_public_id: thumbnailB,
        }),
        request(`/lessons/${lessonId}`, teacher.token, 'PUT', {
            thumbnail_url: 'https://example.test/thumbnail-c.jpg',
            thumbnail_public_id: thumbnailC,
        }),
    ]);
    assert.ok(replacements.every(response => response.status === 200), JSON.stringify(replacements));
    const finalLesson = await database.getOne('SELECT thumbnail_public_id FROM lessons WHERE id = ?', [lessonId]);
    const replacedIntermediate = finalLesson.thumbnail_public_id === thumbnailB ? thumbnailC : thumbnailB;
    assert.ok(await database.getOne(
        'SELECT id FROM cloudinary_cleanup_jobs WHERE public_id = ? AND resource_type = ?',
        [firstThumbnail, 'image']
    ));
    assert.ok(await database.getOne(
        'SELECT id FROM cloudinary_cleanup_jobs WHERE public_id = ? AND resource_type = ?',
        [replacedIntermediate, 'image']
    ));

    const toggles = await Promise.all([
        request(`/lessons/${lessonId}/like`, other.token, 'POST', {}),
        request(`/lessons/${lessonId}/like`, other.token, 'POST', {}),
    ]);
    assert.ok(toggles.every(response => response.status === 200), JSON.stringify(toggles));
    const likeRowCount = Number((await database.getOne(
        'SELECT COUNT(*) AS count FROM lesson_likes WHERE lesson_id = ?',
        [lessonId]
    )).count);
    const likeTotal = Number((await database.getOne(
        'SELECT likes FROM lessons WHERE id = ?',
        [lessonId]
    )).likes);
    assert.equal(likeTotal, likeRowCount);
});

test('lesson deletion requires ownership and cleans references without erasing schedule history', async () => {
    const title = `Delete contract lesson ${process.pid}`;
    const created = await request('/lessons', teacher.token, 'POST', {
        title,
        subject: 'Biology',
        grade: 7,
        is_published: true,
        thumbnail_url: 'https://example.test/delete-thumbnail.jpg',
        thumbnail_public_id: `urpaq-lessons/${teacher.user.id}/delete-thumbnail-${process.pid}`,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const deletableId = created.body.id;

    const file = await request('/lesson-files', teacher.token, 'POST', {
        lesson_id: deletableId,
        file_url: 'https://example.test/delete-contract.pdf',
        file_name: 'delete-contract.pdf',
        file_type: 'pdf',
        public_id: `urpaq-lessons/${teacher.user.id}/delete-contract-${process.pid}`,
    });
    assert.equal(file.status, 201, JSON.stringify(file.body));
    assert.equal((await request(`/lessons/${deletableId}/like`, other.token, 'POST', {})).status, 200);
    assert.equal((await request(`/lessons/${deletableId}/save`, other.token, 'POST', {})).body.saved, true);
    await database.runQuery(
        'INSERT INTO lesson_categories (lesson_id, category_id) VALUES (?, 1)',
        [deletableId]
    );
    await database.runQuery(
        'INSERT INTO lesson_stats (lesson_id, stat_date, views, downloads) VALUES (?, ?, 3, 1)',
        [deletableId, '2099-01-01']
    );
    const schedule = await database.runQuery(
        `INSERT INTO lesson_schedule
            (user_id, lesson_id, title, day_of_week, start_time)
         VALUES (?, ?, ?, 1, '09:00')`,
        [teacher.user.id, deletableId, title]
    );
    const scheduleId = Number(schedule.lastInsertRowid);
    const liveCode = `DL${String(deletableId).padStart(4, '0')}`;
    const live = await database.runQuery(
        'INSERT INTO live_sessions (code, lesson_id, teacher_id) VALUES (?, ?, ?)',
        [liveCode, deletableId, teacher.user.id]
    );
    const liveId = Number(live.lastInsertRowid);

    assert.equal((await request(`/lessons/${deletableId}`, null, 'DELETE')).status, 401);
    assert.equal((await request(`/lessons/${deletableId}`, other.token, 'DELETE')).status, 403);
    assert.ok(await database.getOne('SELECT id FROM lessons WHERE id = ?', [deletableId]));
    assert.ok(await database.getOne('SELECT id FROM saved_materials WHERE lesson_id = ?', [deletableId]));

    const removed = await request(`/lessons/${deletableId}`, teacher.token, 'DELETE');
    assert.equal(removed.status, 200, JSON.stringify(removed.body));
    assert.equal(removed.body.success, true);
    assert.equal(removed.body.cleanup_pending, 2);
    assert.equal((await request(`/lessons/${deletableId}`, teacher.token)).status, 404);
    assert.equal((await request(`/lessons/${deletableId}`, teacher.token, 'DELETE')).status, 404);
    assert.equal(await database.getOne('SELECT id FROM lessons WHERE id = ?', [deletableId]), null);
    for (const table of ['lesson_files', 'lesson_likes', 'saved_materials', 'lesson_categories', 'lesson_stats']) {
        assert.equal(
            Number((await database.getOne(`SELECT COUNT(*) AS count FROM ${table} WHERE lesson_id = ?`, [deletableId])).count),
            0,
            `${table} should not retain lesson ${deletableId}`
        );
    }
    assert.equal((await database.getOne('SELECT lesson_id FROM lesson_schedule WHERE id = ?', [scheduleId])).lesson_id, null);
    assert.equal((await database.getOne('SELECT lesson_id FROM live_sessions WHERE id = ?', [liveId])).lesson_id, null);
    assert.ok(!(await request('/lessons', teacher.token)).body.some(lesson => lesson.id === deletableId));
    const cleanupJob = await database.getOne(
        'SELECT status, attempts, asset_owner_id FROM cloudinary_cleanup_jobs WHERE public_id = ?',
        [`urpaq-lessons/${teacher.user.id}/delete-contract-${process.pid}`]
    );
    assert.ok(['pending', 'processing'].includes(cleanupJob.status));
    assert.ok([0, 1].includes(Number(cleanupJob.attempts)));
    assert.equal(Number(cleanupJob.asset_owner_id), teacher.user.id);
    const reattachDuringCleanup = await request('/lesson-files', teacher.token, 'POST', {
        lesson_id: lessonId,
        file_url: 'https://example.test/delete-contract.pdf',
        file_name: 'delete-contract.pdf',
        file_type: 'pdf',
        public_id: `urpaq-lessons/${teacher.user.id}/delete-contract-${process.pid}`,
    });
    assert.equal(reattachDuringCleanup.status, 409, JSON.stringify(reattachDuringCleanup.body));
    assert.equal(reattachDuringCleanup.body.code, 'ASSET_CLEANUP_IN_PROGRESS');
    assert.ok(await database.getOne(
        'SELECT id FROM cloudinary_cleanup_jobs WHERE public_id = ?',
        [`urpaq-lessons/${teacher.user.id}/delete-thumbnail-${process.pid}`]
    ));
    await database.runQuery('DELETE FROM lesson_schedule WHERE id = ?', [scheduleId]);
    await database.runQuery('DELETE FROM live_sessions WHERE id = ?', [liveId]);
});

test('sold lessons reject hard deletion and retain purchase access', async () => {
    const created = await request('/lessons', teacher.token, 'POST', {
        title: `Sold deletion guard ${process.pid}`,
        is_published: true,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const soldLessonId = created.body.id;
    await database.runQuery(
        'UPDATE lessons SET for_sale = 1, price_tokens = 20 WHERE id = ?',
        [soldLessonId]
    );
    await database.runQuery(
        `INSERT INTO marketplace_purchases
            (buyer_id, seller_id, lesson_id, tokens_paid)
         VALUES (?, ?, ?, 20)`,
        [other.user.id, teacher.user.id, soldLessonId]
    );
    const attachment = await request('/lesson-files', teacher.token, 'POST', {
        lesson_id: soldLessonId,
        file_url: 'https://example.test/purchased-lesson.pdf',
        file_name: 'purchased-lesson.pdf',
        file_type: 'pdf',
    });
    assert.equal(attachment.status, 201, JSON.stringify(attachment.body));

    const blocked = await request(`/lessons/${soldLessonId}`, teacher.token, 'DELETE');
    assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
    assert.ok(await database.getOne('SELECT id FROM lessons WHERE id = ?', [soldLessonId]));
    assert.ok(await database.getOne('SELECT id FROM marketplace_purchases WHERE lesson_id = ?', [soldLessonId]));
    assert.equal((await request(`/lessons/${soldLessonId}`, other.token)).status, 200);
    assert.equal((await request(`/lesson-files/${soldLessonId}`, other.token)).body.length, 1);
    const archived = await request(`/lessons/${soldLessonId}/archive`, teacher.token, 'PATCH', {});
    assert.equal(archived.status, 200, JSON.stringify(archived.body));
    assert.equal(archived.body.is_archived, 1);
    assert.equal((await request(`/lessons/${soldLessonId}`, other.token)).status, 200);
    assert.equal((await request(`/lesson-files/${soldLessonId}`, other.token)).body.length, 1);
    const purchased = await request('/marketplace/my', other.token);
    assert.ok(purchased.body.lessons.some(lesson => lesson.id === soldLessonId && lesson.is_archived === 1));

    await database.runQuery('DELETE FROM marketplace_purchases WHERE lesson_id = ?', [soldLessonId]);
    await database.runQuery('DELETE FROM lessons WHERE id = ?', [soldLessonId]);
});

test('lesson creation and duplication copy files safely and enforce the free-plan limit atomically', async () => {
    const source = await request('/lessons', other.token, 'POST', {
        title: `Duplicate source ${process.pid}`,
        subject: 'Physics',
        grade: 9,
        thumbnail_url: 'https://example.test/duplicate-thumbnail.jpg',
        thumbnail_public_id: `urpaq-lessons/${other.user.id}/duplicate-thumbnail-${process.pid}`,
    });
    assert.equal(source.status, 201, JSON.stringify(source.body));
    const sourceId = source.body.id;
    for (const [index, name] of ['notes.pdf', 'diagram.png'].entries()) {
        const attached = await request('/lesson-files', other.token, 'POST', {
            lesson_id: sourceId,
            file_url: `https://example.test/${name}`,
            file_name: name,
            file_type: name.endsWith('.pdf') ? 'pdf' : 'image',
            public_id: `urpaq-lessons/${other.user.id}/duplicate-${process.pid}-${index}`,
            order_index: index,
        });
        assert.equal(attached.status, 201, JSON.stringify(attached.body));
    }

    const duplicated = await request(`/lessons/${sourceId}/duplicate`, other.token, 'POST', {});
    assert.equal(duplicated.status, 201, JSON.stringify(duplicated.body));
    assert.equal(duplicated.body.thumbnail_public_id, `urpaq-lessons/${other.user.id}/duplicate-thumbnail-${process.pid}`);
    assert.equal(Number(duplicated.body.thumbnail_asset_owner_id), other.user.id);
    const copiedFiles = await database.getAll(
        `SELECT file_name, file_url, file_type, public_id, asset_owner_id, order_index
         FROM lesson_files WHERE lesson_id = ? ORDER BY order_index`,
        [duplicated.body.id]
    );
    assert.deepEqual(
        copiedFiles.map(file => ({
            file_name: file.file_name,
            file_url: file.file_url,
            file_type: file.file_type,
            public_id: file.public_id,
            asset_owner_id: Number(file.asset_owner_id),
            order_index: Number(file.order_index),
        })),
        [
            { file_name: 'notes.pdf', file_url: 'https://example.test/notes.pdf', file_type: 'pdf', public_id: `urpaq-lessons/${other.user.id}/duplicate-${process.pid}-0`, asset_owner_id: other.user.id, order_index: 0 },
            { file_name: 'diagram.png', file_url: 'https://example.test/diagram.png', file_type: 'image', public_id: `urpaq-lessons/${other.user.id}/duplicate-${process.pid}-1`, asset_owner_id: other.user.id, order_index: 1 },
        ]
    );

    const currentCount = Number((await database.getOne(
        'SELECT COUNT(*) AS count FROM lessons WHERE user_id = ? AND is_archived = 0',
        [other.user.id]
    )).count);
    for (let index = currentCount; index < 4; index += 1) {
        await database.runQuery(
            'INSERT INTO lessons (title, user_id) VALUES (?, ?)',
            [`Limit filler ${process.pid}-${index}`, other.user.id]
        );
    }
    const beforeParallelDuplicate = Number((await database.getOne(
        'SELECT COUNT(*) AS count FROM lessons WHERE user_id = ? AND is_archived = 0',
        [other.user.id]
    )).count);
    assert.equal(beforeParallelDuplicate, 4);
    const parallel = await Promise.all([
        request(`/lessons/${sourceId}/duplicate`, other.token, 'POST', {}),
        request(`/lessons/${sourceId}/duplicate`, other.token, 'POST', {}),
    ]);
    assert.deepEqual(parallel.map(result => result.status).sort(), [201, 403]);
    assert.equal(parallel.find(result => result.status === 403).body.code, 'LIMIT_REACHED_LESSONS');
    assert.equal(Number((await database.getOne(
        'SELECT COUNT(*) AS count FROM lessons WHERE user_id = ? AND is_archived = 0',
        [other.user.id]
    )).count), 5);

    const blocked = await request(`/lessons/${sourceId}/duplicate`, other.token, 'POST', {});
    assert.equal(blocked.status, 403, JSON.stringify(blocked.body));
    assert.equal(blocked.body.code, 'LIMIT_REACHED_LESSONS');
    assert.equal(Number((await database.getOne(
        'SELECT COUNT(*) AS count FROM lessons WHERE user_id = ? AND is_archived = 0',
        [other.user.id]
    )).count), 5);

    await database.runQuery('DELETE FROM lessons WHERE user_id = ?', [other.user.id]);
    for (let index = 0; index < 4; index += 1) {
        await database.runQuery(
            'INSERT INTO lessons (title, user_id) VALUES (?, ?)',
            [`Create limit filler ${process.pid}-${index}`, other.user.id]
        );
    }
    const parallelCreates = await Promise.all([
        request('/lessons', other.token, 'POST', { title: `Parallel create A ${process.pid}` }),
        request('/lessons', other.token, 'POST', { title: `Parallel create B ${process.pid}` }),
    ]);
    assert.deepEqual(parallelCreates.map(result => result.status).sort(), [201, 403]);
    assert.equal(Number((await database.getOne(
        'SELECT COUNT(*) AS count FROM lessons WHERE user_id = ? AND is_archived = 0',
        [other.user.id]
    )).count), 5);
    await database.runQuery('DELETE FROM lessons WHERE user_id = ?', [other.user.id]);
});

test('parallel share requests return one durable lesson URL', async () => {
    const created = await request('/lessons', teacher.token, 'POST', {
        title: `Parallel share ${process.pid}`,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));

    const shares = await Promise.all([
        request(`/lessons/${created.body.id}/share`, teacher.token, 'POST', {}),
        request(`/lessons/${created.body.id}/share`, teacher.token, 'POST', {}),
    ]);
    assert.deepEqual(shares.map(result => result.status), [200, 200]);
    assert.equal(shares[0].body.share_url, shares[1].body.share_url);

    const persisted = await database.getOne(
        'SELECT share_token FROM lessons WHERE id = ?',
        [created.body.id]
    );
    assert.ok(persisted.share_token);
    assert.match(shares[0].body.share_url, new RegExp(`share_token=${persisted.share_token}$`));
    await database.runQuery('DELETE FROM lessons WHERE id = ?', [created.body.id]);
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
