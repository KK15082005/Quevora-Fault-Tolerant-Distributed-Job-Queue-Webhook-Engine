import crypto from 'node:crypto';
import { Router } from 'express';
import { pool } from '@quevora/shared';
import { requireJwt, type AuthRequest } from '../middleware/requireJwt.js';

export const apiKeysRouter = Router();
apiKeysRouter.use(requireJwt); // All routes below require a logged-in JWT user

// POST /api-keys -> Create a new API key (returns raw key ONCE)
apiKeysRouter.post('/', async (req: AuthRequest, res) => {
    const rawKey = `qv_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 14);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const { rows } = await pool.query(
        `INSERT INTO api (tenants_id, key_prefix, key_hash)
     VALUES ($1, $2, $3)
     RETURNING id, key_prefix, created_at`,
        [req.tenantId, keyPrefix, keyHash]
    );

    return res.status(201).json({
        ...rows[0],
        apiKey: rawKey, // Shown once!
    });
});

// GET /api-keys -> List my keys (never return key_hash!)
apiKeysRouter.get('/', async (req: AuthRequest, res) => {
    const { rows } = await pool.query(
        `SELECT id, key_prefix, created_at, revoked_at
     FROM api
     WHERE tenants_id = $1
     ORDER BY created_at DESC`,
        [req.tenantId]
    );
    return res.json({ keys: rows });
});

// DELETE /api-keys/:id -> Revoke a key safely
apiKeysRouter.delete('/:id', async (req: AuthRequest, res) => {
    const { rowCount } = await pool.query(
        `UPDATE api
     SET revoked_at = NOW()
     WHERE id = $1 AND tenants_id = $2 AND revoked_at IS NULL`,
        [req.params.id, req.tenantId]
    );
    if (rowCount === 0) {
        return res.status(404).json({ error: 'API key not found or already revoked' });
    }
    return res.json({ revoked: true });
});