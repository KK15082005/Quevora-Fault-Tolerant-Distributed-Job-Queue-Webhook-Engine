import crypto from 'node:crypto';
import type { Response, NextFunction } from 'express';
import { pool } from '@quevora/shared';
import type { AuthRequest } from './requireJwt.js';

export async function requireApiKey(req: AuthRequest, res: Response, next: NextFunction) {
    const rawKey = req.header('x-api-key');
    if (!rawKey) {
        return res.status(401).json({ error: 'Missing x-api-key header' });
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const { rows } = await pool.query(
        'SELECT tenants_id FROM api WHERE key_hash = $1 AND revoked_at IS NULL',
        [keyHash]
    );

    if (!rows[0]) {
        return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    req.tenantId = rows[0].tenants_id;
    next();
}