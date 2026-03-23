const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

let db = null;

async function getDatabase() {
    if (db) return db;

    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (url && authToken) {
        // Cloud Turso database
        db = createClient({ url, authToken });
        console.log('✅ Connected to Turso cloud database');
    } else {
        // Local fallback for development
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'local.db');
        db = createClient({ url: `file:${dbPath}` });
        console.log('✅ Using local SQLite database at', dbPath);
    }

    await initDatabase();
    return db;
}

async function initDatabase() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const statements = schema.split(';').filter(s => s.trim());

    for (const statement of statements) {
        try {
            await db.execute(statement);
        } catch (err) {
            if (!err.message.includes('already exists') &&
                !err.message.includes('UNIQUE constraint')) {
                console.error('SQL Error:', err.message);
            }
        }
    }
}

// Run a write query (INSERT, UPDATE, DELETE)
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

// Get last insert ID
async function getLastInsertId() {
    const result = await db.execute("SELECT last_insert_rowid() as id");
    return result.rows.length > 0 ? result.rows[0].id : null;
}

// No-op for compatibility (Turso auto-persists)
function saveDatabase() {}

module.exports = {
    getDatabase,
    runQuery,
    getOne,
    getAll,
    getLastInsertId,
    saveDatabase
};
