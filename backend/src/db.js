import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/stockdapp';

let pool;

export async function initDB() {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // 测试连接并初始化表
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        virtual_balance TEXT NOT NULL DEFAULT '0',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stock_code TEXT NOT NULL,
        shares TEXT NOT NULL DEFAULT '0',
        cost_basis TEXT NOT NULL DEFAULT '0',
        UNIQUE(user_id, stock_code)
      );

      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stock_code TEXT NOT NULL,
        stock_name TEXT NOT NULL DEFAULT '',
        is_buy INTEGER NOT NULL,
        price TEXT NOT NULL,
        shares TEXT NOT NULL,
        amount TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 兼容旧表：确保 virtual_balance 列存在
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_balance TEXT NOT NULL DEFAULT '0'`);
    } catch (e) {
      console.warn('Add column warning:', e.message);
    }

    console.log('PostgreSQL database initialized');
  } finally {
    client.release();
  }
}

export function getDB() {
  if (!pool) throw new Error('Database not initialized. Call initDB() first.');
  return pool;
}

// 辅助函数：执行单条查询返回一个结果
export async function queryOne(sql, params) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

// 辅助函数：执行查询返回数组
export async function queryMany(sql, params) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// 辅助函数：执行写入操作
export async function run(sql, params) {
  return await pool.query(sql, params);
}
