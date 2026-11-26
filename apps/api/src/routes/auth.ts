import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '@quevora/shared';
import { requireJwt, type AuthRequest } from '../middleware/requireJwt.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// POST /auth/register
authRouter.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { name, email, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const { rows } = await pool.query(
            `INSERT INTO tenants (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
            [name, email.toLowerCase(), passwordHash]
        );
        const tenant = rows[0];
        const token = jwt.sign({ tenantId: tenant.id }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({ tenant, token });
    } catch (err: any) {
        if (err?.code === '23505') {
            return res.status(409).json({ error: 'Email already registered' });
        }
        return res.status(500).json({ error: 'Server error' });
    }
});

// POST /auth/login
authRouter.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const { rows } = await pool.query(
        'SELECT id, name, email, password_hash FROM tenants WHERE email = $1',
        [email.toLowerCase()]
    );

    const tenant = rows[0];
    if (!tenant) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, tenant.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ tenantId: tenant.id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
        tenant: { id: tenant.id, name: tenant.name, email: tenant.email },
        token,
    });
});

// GET /auth/me (protected test route)
authRouter.get('/me', requireJwt, async (req: AuthRequest, res) => {
    const { rows } = await pool.query(
        'SELECT id, name, email, created_at FROM tenants WHERE id = $1',
        [req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Tenant not found' });
    return res.json({ tenant: rows[0] });
});