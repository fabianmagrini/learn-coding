import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = {
  async connect() {
    const client = await pool.connect();
    client.release();
    return pool;
  },

  async query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  async getClient() {
    return pool.connect();
  },

  async end() {
    await pool.end();
  },
};
