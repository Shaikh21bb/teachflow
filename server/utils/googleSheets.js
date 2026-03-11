const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const SHEET_NAME = 'Users';

let sheetsAPI = null;

async function initGoogleSheets() {
    if (sheetsAPI) return sheetsAPI;

    try {
        // Path to service account credentials
        const credentialsPath = path.join(__dirname, '../config/google-credentials.json');

        // Check if credentials file exists
        if (!fs.existsSync(credentialsPath)) {
            console.warn('⚠️  Google Sheets credentials not found. Sheets integration disabled.');
            console.warn('   Place your service account JSON at: server/config/google-credentials.json');
            return null;
        }

        if (!SPREADSHEET_ID) {
            console.warn('⚠️  GOOGLE_SHEET_ID not set in environment. Sheets integration disabled.');
            return null;
        }

        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        sheetsAPI = google.sheets({ version: 'v4', auth });
        console.log('✅ Google Sheets API initialized');
        return sheetsAPI;
    } catch (error) {
        console.error('❌ Google Sheets initialization error:', error.message);
        return null;
    }
}

// Sync new user to Google Sheets
async function syncUserToGoogleSheets(user) {
    const sheets = await initGoogleSheets();
    if (!sheets) return;

    try {
        const values = [[
            user.id,
            user.name,
            user.email,
            user.role || 'teacher',
            user.created_at || new Date().toISOString(),
            '',  // Last login (empty initially)
            user.is_active ? 'Active' : 'Inactive'
        ]];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:G`,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });

        console.log(`✅ User ${user.email} synced to Google Sheets`);
    } catch (error) {
        console.error('Google Sheets append error:', error.message);
        throw error;
    }
}

// Update last login time in Google Sheets
async function updateLastLogin(email) {
    const sheets = await initGoogleSheets();
    if (!sheets) return;

    try {
        // Find the row with this email
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:G`
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[2] === email);

        if (rowIndex > 0) { // Skip header row
            const range = `${SHEET_NAME}!F${rowIndex + 1}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[new Date().toISOString()]]
                }
            });

            console.log(`✅ Last login updated for ${email}`);
        }
    } catch (error) {
        console.error('Google Sheets update error:', error.message);
        throw error;
    }
}

// Initialize sheet with headers if needed
async function ensureSheetHeaders() {
    const sheets = await initGoogleSheets();
    if (!sheets) return;

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1:G1`
        });

        // If no headers, add them
        if (!response.data.values || response.data.values.length === 0) {
            const headers = [['ID', 'Name', 'Email', 'Role', 'Created At', 'Last Login', 'Status']];
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A1:G1`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: headers }
            });
            console.log('✅ Google Sheets headers created');
        }
    } catch (error) {
        console.error('Google Sheets header check error:', error.message);
    }
}

module.exports = {
    syncUserToGoogleSheets,
    updateLastLogin,
    ensureSheetHeaders
};
