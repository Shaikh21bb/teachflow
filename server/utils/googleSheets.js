const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

// Sync new user to Google Sheets
async function syncUserToGoogleSheets(user) {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
        const payload = {
            name: user.name,
            email: user.email,
            role: user.role || 'teacher',
            created_at: user.created_at || new Date().toISOString(),
            action: 'Регистрация'
        };

        // We use text/plain to avoid CORS preflight issues with Apps Script
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain' }
        });

        console.log(`✅ User ${user.email} registration synced to Google Sheets`);
    } catch (error) {
        console.error('Google Sheets append error:', error.message);
    }
}

// Update last login time in Google Sheets
async function updateLastLogin(email) {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
        const payload = {
            email: email,
            action: 'Авторизация'
        };

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain' }
        });

        console.log(`✅ Last login for ${email} synced to Google Sheets`);
    } catch (error) {
        console.error('Google Sheets update error:', error.message);
    }
}

// Initialize sheet with headers if needed (mock for Apps Script)
async function ensureSheetHeaders() {
    // With our simple Apps Script webhook, we assume headers are managed manually by the user
    console.log('✅ Google Sheets webhook configured');
}

module.exports = {
    syncUserToGoogleSheets,
    updateLastLogin,
    ensureSheetHeaders
};
