import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'stockdapp.db');

let db;

export function initDB() {
  // 确保目录存在（同步）
  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      virtual_balance TEXT NOT NULL DEFAULT '0',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stock_code TEXT NOT NULL,
      shares TEXT NOT NULL DEFAULT '0',
      cost_basis TEXT NOT NULL DEFAULT '0',
      UNIQUE(user_id, stock_code),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stock_code TEXT NOT NULL,
      stock_name TEXT NOT NULL DEFAULT '',
      is_buy INTEGER NOT NULL,
      price TEXT NOT NULL,
      shares TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // 兼容旧表：添加 virtual_balance 列（如果不存在）
  try {
    db.exec(`ALTER TABLE users ADD COLUMN virtual_balance TEXT NOT NULL DEFAULT '0'`);
  } catch (e) {
    // 列已存在，忽略
  }

  console.log('Database initialized at', DB_PATH);
}

export function getDB() {
  return db;
}
