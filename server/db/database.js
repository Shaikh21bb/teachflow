const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'teachflow.db');
let db = null;

async function getDatabase() {
    if (db) return db;

    const SQL = await initSqlJs();

    // Try to load existing database
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        console.log('✅ Database loaded from file');
    } else {
        // Create new database
        db = new SQL.Database();
        await initDatabase();
        console.log('✅ New database created');
    }

    return db;
}

async function initDatabase() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = schema.split(';').filter(s => s.trim());

    for (const statement of statements) {
        try {
            db.run(statement);
        } catch (err) {
            // Ignore errors (like table already exists)
            if (!err.message.includes('already exists')) {
                console.error('SQL Error:', err.message);
            }
        }
    }

    saveDatabase();
}

function saveDatabase() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

// Helper functions for CRUD operations
function runQuery(sql, params = []) {
    db.run(sql, params);
    saveDatabase();
}

function getOne(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return null;
}

function getAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

function getLastInsertId() {
    const result = getOne("SELECT last_insert_rowid() as id");
    return result ? result.id : null;
}

module.exports = {
    getDatabase,
    runQuery,
    getOne,
    getAll,
    getLastInsertId,
    saveDatabase
};
