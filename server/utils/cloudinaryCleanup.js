const crypto = require('crypto');
const { getAll, runQuery, withTransaction } = require('../db/database');

let cleanupRun = null;
let cleanupTimer = null;

function getResourceType(fileType) {
    if (fileType === 'image') return 'image';
    if (fileType === 'video') return 'video';
    return 'raw';
}

function isOwnedLessonAsset(publicId, ownerId) {
    const numericOwnerId = Number(ownerId);
    if (!Number.isSafeInteger(numericOwnerId) || numericOwnerId <= 0) return false;
    const prefix = `urpaq-lessons/${numericOwnerId}/`;
    if (typeof publicId !== 'string' || !publicId.startsWith(prefix)) return false;

    const relativePath = publicId.slice(prefix.length);
    return relativePath.length > 0
        && !relativePath.split('/').some(segment => !segment || segment === '.' || segment === '..');
}

function buildDestroyPayload(publicId, timestamp, apiSecret) {
    const params = {
        invalidate: 'true',
        public_id: publicId,
        timestamp: String(timestamp),
    };
    const stringToSign = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&') + apiSecret;
    return {
        ...params,
        signature: crypto.createHash('sha1').update(stringToSign).digest('hex'),
    };
}

function normalizeCandidate(file) {
    if (!file?.public_id) return null;
    const assetOwnerId = Number(file.asset_owner_id);
    if (!Number.isSafeInteger(assetOwnerId) || assetOwnerId <= 0) return null;
    return {
        publicId: file.public_id,
        resourceType: file.resource_type || getResourceType(file.file_type),
        assetOwnerId,
    };
}

async function enqueueCloudinaryCleanup(transaction, files) {
    const unique = new Map();
    let skipped = 0;
    for (const file of files || []) {
        const candidate = normalizeCandidate(file);
        if (!candidate) {
            if (file?.public_id) skipped += 1;
            continue;
        }
        unique.set(`${candidate.resourceType}:${candidate.publicId}`, candidate);
    }

    for (const candidate of unique.values()) {
        await transaction.execute({
            sql: `INSERT INTO cloudinary_cleanup_jobs
                    (public_id, resource_type, asset_owner_id, status, attempts, last_error, next_attempt_at, updated_at)
                  VALUES (?, ?, ?, 'pending', 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT(public_id, resource_type) DO UPDATE SET
                    asset_owner_id = excluded.asset_owner_id,
                    status = 'pending',
                    attempts = 0,
                    last_error = NULL,
                    next_attempt_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP`,
            args: [candidate.publicId, candidate.resourceType, candidate.assetOwnerId],
        });
    }
    return { queued: unique.size, skipped };
}

async function isCloudinaryCleanupQueued(transaction, publicId, resourceType) {
    if (!publicId) return false;
    return Boolean((await transaction.execute({
        sql: `SELECT id FROM cloudinary_cleanup_jobs
              WHERE public_id = ? AND resource_type = ? LIMIT 1`,
        args: [publicId, resourceType],
    })).rows[0]);
}

async function isStillReferenced(transaction, job) {
    const fileReferences = (await transaction.execute({
        sql: 'SELECT file_type FROM lesson_files WHERE public_id = ?',
        args: [job.public_id],
    })).rows;
    if (fileReferences.some(file => getResourceType(file.file_type) === job.resource_type)) return true;
    if (job.resource_type !== 'image') return false;
    return Boolean((await transaction.execute({
        sql: 'SELECT id FROM lessons WHERE thumbnail_public_id = ? LIMIT 1',
        args: [job.public_id],
    })).rows[0]);
}

async function recordRetry(job, error) {
    const attempts = Number(job.attempts || 0) + 1;
    const delaySeconds = Math.min(3600, 30 * (2 ** Math.min(attempts - 1, 7)));
    await runQuery(
        `UPDATE cloudinary_cleanup_jobs
         SET status = 'pending', attempts = ?, last_error = ?,
             next_attempt_at = datetime('now', ?), updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [attempts, String(error?.message || error).slice(0, 500), `+${delaySeconds} seconds`, job.id]
    );
}

async function claimCleanupJob(job) {
    return withTransaction(async transaction => {
        const claimed = await transaction.execute({
            sql: `UPDATE cloudinary_cleanup_jobs
                  SET status = 'processing', next_attempt_at = datetime('now', '+10 minutes'),
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = ? AND status = 'pending' AND next_attempt_at <= CURRENT_TIMESTAMP`,
            args: [job.id],
        });
        if (!claimed.rowsAffected) return false;
        if (await isStillReferenced(transaction, job)) {
            await transaction.execute({
                sql: 'DELETE FROM cloudinary_cleanup_jobs WHERE id = ?',
                args: [job.id],
            });
            return false;
        }
        return true;
    });
}

async function destroyCloudinaryAsset(job) {
    if (!await claimCleanupJob(job)) return { status: 'referenced-or-claimed' };
    if (!isOwnedLessonAsset(job.public_id, job.asset_owner_id)) {
        await runQuery(
            `UPDATE cloudinary_cleanup_jobs
             SET status = 'manual', last_error = 'Unverified asset provenance', updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [job.id]
        );
        return { status: 'manual' };
    }

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!apiSecret || !apiKey || !cloudName) {
        await recordRetry(job, new Error('Cloudinary cleanup is not configured'));
        return { status: 'pending' };
    }

    try {
        const timestamp = Math.round(Date.now() / 1000);
        const signed = buildDestroyPayload(job.public_id, timestamp, apiSecret);
        const body = new URLSearchParams({ ...signed, api_key: apiKey });
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${job.resource_type}/destroy`,
            { method: 'POST', body, signal: AbortSignal.timeout(5000) }
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !['ok', 'not found'].includes(result.result)) {
            throw new Error(result.error?.message || `Cloudinary cleanup failed (${response.status})`);
        }
        await runQuery('DELETE FROM cloudinary_cleanup_jobs WHERE id = ?', [job.id]);
        return { status: result.result };
    } catch (error) {
        await recordRetry(job, error);
        return { status: 'pending', error };
    }
}

async function processCloudinaryCleanupJobs({ limit = 25 } = {}) {
    if (cleanupRun) return cleanupRun;
    cleanupRun = (async () => {
        // A process may exit after claiming a job. Expired leases make that job
        // available to another instance without losing the cleanup request.
        await runQuery(`UPDATE cloudinary_cleanup_jobs
            SET status = 'pending', updated_at = CURRENT_TIMESTAMP
            WHERE status = 'processing' AND next_attempt_at <= CURRENT_TIMESTAMP`);
        const jobs = await getAll(
            `SELECT * FROM cloudinary_cleanup_jobs
             WHERE status = 'pending' AND next_attempt_at <= CURRENT_TIMESTAMP
             ORDER BY id LIMIT ?`,
            [limit]
        );
        const results = [];
        for (const job of jobs) results.push(await destroyCloudinaryAsset(job));
        return results;
    })();
    try {
        return await cleanupRun;
    } finally {
        cleanupRun = null;
    }
}

function startCloudinaryCleanupWorker() {
    if (cleanupTimer) return cleanupTimer;
    processCloudinaryCleanupJobs().catch(error => console.warn('Cloudinary cleanup worker:', error.message));
    cleanupTimer = setInterval(() => {
        processCloudinaryCleanupJobs().catch(error => console.warn('Cloudinary cleanup worker:', error.message));
    }, 5 * 60 * 1000);
    cleanupTimer.unref?.();
    return cleanupTimer;
}

module.exports = {
    buildDestroyPayload,
    enqueueCloudinaryCleanup,
    getResourceType,
    isCloudinaryCleanupQueued,
    isOwnedLessonAsset,
    processCloudinaryCleanupJobs,
    startCloudinaryCleanupWorker,
};
