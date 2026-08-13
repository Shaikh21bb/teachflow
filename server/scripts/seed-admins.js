/**
 * Seed admin accounts script
 * Run: node server/scripts/seed-admins.js
 *
 * Reads credentials from environment variables or .env file.
 * Never hardcode passwords in source code.
 *
 * Usage:
 *   ADMIN1_EMAIL=admin@example.com ADMIN1_PASSWORD=yourpass node server/scripts/seed-admins.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env.local') });

const bcrypt = require('bcryptjs');
const path = require('path');

// Load DB
process.chdir(path.join(__dirname, '../../'));
const { runQuery, getOne } = require('../db/database');

async function seedAdmins() {
    console.log('🔧 Seeding admin accounts...\n');

    // Read from env — never hardcode passwords
    const admins = [
        {
            email: process.env.ADMIN1_EMAIL || 'Shaqwork@gmail.com',
            password: process.env.ADMIN1_PASSWORD,
            name: 'Admin 1 (Shaq)'
        },
        {
            email: process.env.ADMIN2_EMAIL || 'bekzansajhnazar@gmail.com',
            password: process.env.ADMIN2_PASSWORD,
            name: 'Admin 2 (Bekzan)'
        }
    ];

    if (!admins[0].password || !admins[1].password) {
        console.error('❌ Set ADMIN1_PASSWORD and ADMIN2_PASSWORD environment variables!');
        console.error('   Example: ADMIN1_PASSWORD=MyPass123 ADMIN2_PASSWORD=MyPass123 node server/scripts/seed-admins.js');
        process.exit(1);
    }

    for (const admin of admins) {
        const existing = await getOne('SELECT id, role_admin FROM users WHERE email = ?', [admin.email]);

        if (existing) {
            // Update existing user to admin
            await runQuery(
                'UPDATE users SET role_admin = 1, role = ? WHERE email = ?',
                ['admin', admin.email]
            );
            console.log(`✅ Updated to admin: ${admin.email} (id: ${existing.id})`);
        } else {
            // Create new admin user
            const hash = await bcrypt.hash(admin.password, 12);
            await runQuery(
                `INSERT INTO users (name, email, password_hash, role, role_admin, credits, token_balance, plan)
                 VALUES (?, ?, ?, 'admin', 1, 9999, 99999, 'pro')`,
                [admin.name, admin.email, hash]
            );
            const created = await getOne('SELECT id FROM users WHERE email = ?', [admin.email]);
            console.log(`✅ Created admin: ${admin.email} (id: ${created.id})`);
        }
    }

    console.log('\n✅ Admin seeding complete!');
    console.log('   Login at /admin with your credentials.\n');
    process.exit(0);
}

seedAdmins().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
