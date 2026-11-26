import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    tenantId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function requireJwt(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing Bearer token' });
    }

    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { tenantId: string };
        req.tenantId = payload.tenantId;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}