import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDB } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STOCK_META_PATH = path.join(__dirname, '..', '..', 'stock-meta.json');

const router = Router();

// ============ 获取账户余额 ============
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare('SELECT id, username, wallet_address, virtual_balance FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    res.json({
      usdtBalance: '0',
      chainBalance: user.virtual_balance || '0',
      walletAddress: user.wallet_address,
    });
  } catch (e) {
    console.error('获取余额失败:', e);
    res.status(500).json({ error: '获取余额失败' });
  }
});

// ============ 获取持仓 ============
router.get('/positions', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const rows = db.prepare('SELECT * FROM positions WHERE user_id = ?').all(req.userId);

    const positions = rows.map(r => {
      const shares = Number(r.shares);
      const costBasis = Number(r.cost_basis);
      return {
        code: r.stock_code,
        shares,
        costBasis,
        currentPrice: costBasis,
        marketValue: costBasis * shares,
        profit: 0,
        profitPct: 0,
      };
    });

    res.json({ positions });
  } catch (e) {
    console.error('获取持仓失败:', e);
    res.status(500).json({ error: '获取持仓失败' });
  }
});

// ============ 获取交易记录 ============
router.get('/trades', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const rows = db.prepare(`
      SELECT * FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(req.userId);

    const trades = rows.map(r => ({
      code: r.stock_code,
      stockName: r.stock_name,
      isBuy: r.is_buy === 1,
      price: Number(r.price),
      shares: Number(r.shares),
      amount: Number(r.amount),
      time: r.created_at,
    }));

    res.json({ trades });
  } catch (e) {
    console.error('获取交易记录失败:', e);
    res.status(500).json({ error: '获取交易记录失败' });
  }
});

// ============ 获取股票列表（本地 JSON） ============
router.get('/stocks', async (req, res) => {
  try {
    if (fs.existsSync(STOCK_META_PATH)) {
      const meta = JSON.parse(fs.readFileSync(STOCK_META_PATH, 'utf-8'));
      return res.json({ stocks: meta });
    }
    res.json({ stocks: [] });
  } catch (e) {
    res.status(500).json({ error: '获取股票列表失败' });
  }
});

export default router;
