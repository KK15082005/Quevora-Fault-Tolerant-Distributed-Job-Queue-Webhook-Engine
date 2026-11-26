import { pool, connectDB } from './db.js';

async function run() {
    await connectDB();

    const res = await pool.query('SELECT NOW()');
    console.log('Postgres connected ! Time : ', res.rows[0].now);
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema= 'public'");
    console.log('TABLES : ', tables.rows.map((t: { table_name: String }) => t.table_name));
    await pool.end();
}

run();
