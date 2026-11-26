import { error } from 'console';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: `${import.meta.dirname}/../../../.env` });

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 15,
});

export async function connectDB() {
    for (let i = 1; i <= 10; i++) {
        try {
            await pool.query('SELECT 1')
            return;
        } catch (err: any) {
            console.log(`Waiting for Postgres...(${i}/10)`, err.message || err.code || err);
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
    throw new Error('Could not connect to Postgres')
}