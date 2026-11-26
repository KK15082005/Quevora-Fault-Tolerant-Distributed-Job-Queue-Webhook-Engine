import express from 'express';
import cors from 'cors';
import { pool, connectDB } from '@quevora/shared';
import { authRouter } from './routes/auth.js';
import { apiKeysRouter } from './routes/apiKey.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use('/auth', authRouter);
app.use('/api-keys', apiKeysRouter);

app.get('/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: "ok", db: "Connected" })
    } catch (error) {
        res.status(500).json({ status: "error", db: "Disconnected" })
    }
});

async function start() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Engine Running on PORT ${PORT}`);
    });
}

start();