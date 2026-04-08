require('dotenv').config();
const { getDatabase } = require('../db/database.js');

async function migrate() {
    try {
        console.log('Connecting to database...');
        const db = await getDatabase();
        
        console.log('Adding credits column to users table...');
        await db.execute('ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 10;');
        
        console.log('✅ Migration successful: added credits field to users.');
        
        // Give everyone 10 credits initially if they are already existing
        await db.execute('UPDATE users SET credits = 10;');
        
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('✅ Migration already applied (credits column exists).');
        } else {
            console.error('❌ Migration failed:', error);
        }
    }
    process.exit(0);
}

migrate();
