const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'urpaq-ai-32-char-secret-key-xoxo').substring(0, 32);
const IV_LENGTH = 16;

/**
 * Encrypt a plaintext string (e.g. API token) before storing in DB.
 */
function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt a previously encrypted string from DB.
 */
function decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
        const [ivHex, encHex] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedBuf = Buffer.from(encHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedBuf);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        console.error('Decryption error:', err.message);
        return null;
    }
}

module.exports = { encrypt, decrypt };
