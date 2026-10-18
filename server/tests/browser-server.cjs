const { directory } = require('./setup.cjs');
const { rmSync } = require('node:fs');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

async function start() {
    const providers = require('../utils/aiProviders');
    providers.chatWithAI = async () => 'Test lesson plan with a practical task and homework.';
    const app = require('../index');
    await app.ready();
    const hash = await bcrypt.hash('Testing12345', 4);
    await db.runQuery("INSERT INTO users (name, email, password_hash, credits, role_admin) VALUES (?, ?, ?, 5, 1)", ['Test Teacher', 'teacher@test.example', hash]);
    await db.runQuery("INSERT INTO classes (name, subject, grade, user_id, telegram_invite_code) VALUES ('8A', 'Math', 8, 1, 'TEST-CLASS')");
    await db.runQuery("INSERT INTO students (name, class_id, username, password_hash) VALUES ('Test Student', 1, 'student1', ?)", [hash]);
    await db.runQuery("INSERT INTO lessons (title, subject, grade, user_id, content, slides_json) VALUES ('Saved lesson', 'Math', 8, 1, 'Existing content', ?)", [JSON.stringify([{ type: 'cover', title: 'Math lesson' }, { type: 'content', title: 'Equations', bullets: ['2 + 2 = 4'] }])]);
    await db.runQuery("INSERT INTO assignments (title, class_id, user_id, instructions, max_score) VALUES ('Homework task', 1, 1, 'Explain the solution to 2 + 2.', 10)");
    await db.runQuery("INSERT INTO quizzes (title, user_id, questions) VALUES ('Test quiz', 1, ?)", [JSON.stringify([{ question: '2 + 2?', options: ['A) 4', 'B) 5'], correct: 'A' }])]);
    await db.runQuery('INSERT INTO quiz_assignments (quiz_id, class_id, assigned_by) VALUES (1, 1, 1)');
    const server = app.listen(3101, '127.0.0.1', () => console.log('Browser test API ready'));
    async function stop() {
        server.closeAllConnections();
        server.close();
        (await db.getDatabase()).close();
        rmSync(directory, { recursive: true, force: true });
        process.exit(0);
    }
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
}
start().catch(error => { console.error(error); process.exit(1); });
