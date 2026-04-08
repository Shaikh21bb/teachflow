const { createClient } = require('@libsql/client');
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

async function resetDB() {
    const db = createClient({ url, authToken });
    const tables = ['saved_materials', 'notifications', 'assignments', 'lessons', 'students', 'classes', 'users'];
    for (const table of tables) {
        try {
            await db.execute(`DROP TABLE IF EXISTS ${table}`);
            console.log(`Dropped ${table}`);
        } catch(e) { console.error(`Error dropping ${table}:`, e.message); }
    }
}
resetDB().catch(console.error);
