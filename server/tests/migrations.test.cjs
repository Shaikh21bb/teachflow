const { directory } = require('./setup.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@libsql/client');
const { rmSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('legacy database upgrades without losing accounts or refilling spent balances on restart', async () => {
    const legacy = createClient({ url: `file:${process.env.DATABASE_PATH}` });
    await legacy.execute(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password_hash TEXT,
        role TEXT DEFAULT 'teacher', credits INTEGER DEFAULT 10, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT, is_active INTEGER DEFAULT 1)`);
    await legacy.execute("INSERT INTO users (id, name, email, password_hash, credits) VALUES (1, 'Existing teacher', 'existing@test.example', 'hash', 3)");
    await legacy.execute(`CREATE TABLE game_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'kk', questions TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'lobby', round_index INTEGER NOT NULL DEFAULT 0,
        round_seconds INTEGER NOT NULL DEFAULT 30, deadline INTEGER, remaining_ms INTEGER,
        cyan_health INTEGER NOT NULL DEFAULT 10000, coral_health INTEGER NOT NULL DEFAULT 10000,
        revision INTEGER NOT NULL DEFAULT 0, last_event TEXT, events TEXT NOT NULL DEFAULT '[]', winner INTEGER,
        request_key TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at INTEGER NOT NULL,
        ended_at TEXT, UNIQUE(teacher_id, request_key)
    )`);
    await legacy.execute({
        sql: "INSERT INTO game_rooms (code,teacher_id,title,questions,expires_at) VALUES (?,?,?,?,?)",
        args: ['ABC123', 1, 'Legacy arena', '[]', Date.now() + 3600000],
    });
    await legacy.execute(`CREATE TABLE saved_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, lesson_id INTEGER,
        title TEXT NOT NULL, type TEXT DEFAULT 'lesson', notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    await legacy.execute("INSERT INTO saved_materials (user_id, lesson_id, title) VALUES (1, 77, 'Duplicate lesson')");
    await legacy.execute("INSERT INTO saved_materials (user_id, lesson_id, title) VALUES (1, 77, 'Duplicate lesson')");
    legacy.close();
    const app = require('../index');
    const db = require('../db/database');
    try {
        await app.ready();
        const user = await db.getOne('SELECT * FROM users WHERE id = 1');
        assert.equal(user.credits, 3);
        assert.equal(user.name, 'Existing teacher');
        assert.equal(user.token_balance, 0);
        const columns = await db.getAll('PRAGMA table_info(ad_views)');
        assert.ok(columns.some(column => column.name === 'claim_token'));
        const gameColumns = await db.getAll('PRAGMA table_info(game_rooms)');
        assert.ok(gameColumns.some(column => column.name === 'mode'));
        assert.ok(gameColumns.some(column => column.name === 'play_mode'));
        const lessonFileColumns = await db.getAll('PRAGMA table_info(lesson_files)');
        assert.ok(lessonFileColumns.some(column => column.name === 'asset_owner_id'));
        const lessonColumns = await db.getAll('PRAGMA table_info(lessons)');
        assert.ok(lessonColumns.some(column => column.name === 'thumbnail_public_id'));
        assert.ok(lessonColumns.some(column => column.name === 'thumbnail_asset_owner_id'));
        assert.ok(await db.getOne("SELECT name FROM sqlite_master WHERE type='table' AND name='cloudinary_cleanup_jobs'"));
        const legacyRoom = await db.getOne("SELECT title,questions,mode,play_mode FROM game_rooms WHERE code='ABC123'");
        assert.deepEqual(legacyRoom, { title: 'Legacy arena', questions: '[]', mode: 'arena', play_mode: 'multiplayer' });
        assert.equal((await db.getOne('SELECT COUNT(*) AS count FROM saved_materials WHERE user_id = 1 AND lesson_id = 77')).count, 1);
        await assert.rejects(
            db.runQuery("INSERT INTO saved_materials (user_id, lesson_id, title) VALUES (1, 77, 'Blocked duplicate')"),
            /UNIQUE constraint failed/
        );
        const child = spawnSync(process.execPath, ['-e', "const app=require('./server/index');app.ready().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})"], {
            cwd: path.resolve(__dirname, '../..'), env: process.env, encoding: 'utf8', timeout: 10000,
        });
        assert.equal(child.status, 0, child.stderr);
        assert.ok(!child.stdout.includes('Migrations complete'));
        assert.equal((await db.getOne('SELECT token_balance FROM users WHERE id = 1')).token_balance, 0);
    } finally {
        (await db.getDatabase()).close();
        rmSync(directory, { recursive: true, force: true });
    }
});
