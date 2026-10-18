require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

let db = null;
let initialization = null;
const SCHEMA_VERSION = 'platform-21-quests';

async function getDatabase() {
    if (initialization) return initialization;
    initialization = initializeDatabase();
    try { return await initialization; }
    catch (error) { db?.close(); db = null; initialization = null; throw error; }
}

async function initializeDatabase() {

    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (url && authToken) {
        db = createClient({ url, authToken });
        console.log('✅ Connected to Turso cloud database');
    } else {
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'local.db');
        db = createClient({ url: `file:${dbPath}` });
        console.log('✅ Using local SQLite database at', dbPath);
    }

    await db.execute('PRAGMA foreign_keys = ON');
    await db.execute('CREATE TABLE IF NOT EXISTS app_schema_versions (version TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)');
    await initDatabase();
    return db;
}

async function initDatabase() {
    const installed = await db.execute({ sql: 'SELECT version FROM app_schema_versions WHERE version = ?', args: [SCHEMA_VERSION] });
    if (installed.rows.length) return;
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.promises.readFile(schemaPath, 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
        try {
            await db.execute(statement);
        } catch (err) {
            if (!err.message.includes('already exists') &&
                !err.message.includes('UNIQUE constraint')) {
                // Existing databases receive missing columns in runMigrations().
                if (!err.message.includes('no such column')) throw err;
            }
        }
    }
}

// Run a write query — returns full result (use result.lastInsertRowid directly!)
async function runQuery(sql, params = []) {
    const result = await db.execute({ sql, args: params });
    return result;
}

// Get a single row
async function getOne(sql, params = []) {
    const result = await db.execute({ sql, args: params });
    return result.rows.length > 0 ? result.rows[0] : null;
}

// Get all rows
async function getAll(sql, params = []) {
    const result = await db.execute({ sql, args: params });
    return result.rows;
}

// Get last insert ID — use result.lastInsertRowid from runQuery() instead when possible
async function getLastInsertId() {
    const result = await db.execute("SELECT last_insert_rowid() as id");
    return result.rows.length > 0 ? result.rows[0].id : null;
}

async function withTransaction(work) {
    const client = await getDatabase();
    const transaction = await client.transaction('write');
    try {
        const result = await work(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        if (!transaction.closed) await transaction.rollback();
        throw error;
    } finally { transaction.close(); }
}

// No-op for compatibility
function saveDatabase() {}

module.exports = {
    getDatabase,
    runQuery,
    getOne,
    getAll,
    getLastInsertId,
    withTransaction,
    SCHEMA_VERSION,
    saveDatabase
};
