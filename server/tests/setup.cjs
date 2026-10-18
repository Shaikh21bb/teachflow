const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const directory = mkdtempSync(join(tmpdir(), 'teachflow-test-'));
Object.assign(process.env, {
    NODE_ENV: 'test', TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '',
    DATABASE_PATH: join(directory, 'test.db'),
    JWT_SECRET: 'test-only-secret-for-isolated-integration-database',
    JWT_REFRESH_SECRET: 'test-only-refresh-secret-for-isolated-database',
    GEMINI_API_KEY: '', GROQ_API_KEY: '', HUGGINGFACE_API_KEY: '',
    GOOGLE_SCRIPT_URL: '', ADMIN_EMAILS: '', RESEND_API_KEY: '',
    CLOUDINARY_API_SECRET: '', CLOUDINARY_API_KEY: '', CLOUDINARY_CLOUD_NAME: '',
    ENABLE_TEST_PAYMENTS: 'false',
});
module.exports = { directory };
