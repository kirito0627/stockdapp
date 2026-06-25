import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDB } from '../db.js';

const router = Router();

// ============ 买入股票（按股数，虚拟交易，不走链） ============
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { stockCode, stockName, shares, livePrice } = req.body;

    if (!stockCode || !shares) {
      return res.status(400).json({ error: '缺少股票代码或股数' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const name = stockName || stockCode;
    const buyShares = Number(shares);
    const price = Math.max(Number(livePrice || 1), 0.01);
    const balance = Number(user.virtual_balance || '0');

    // 计算买入金额（股数 × 价格）
    const cost = buyShares * price;

    // 检查余额是否足够
    if (cost > balance) {
      return res.status(400).json({ error: `余额不足：需要 ¥${cost.toFixed(2)}，可用 ¥${balance.toFixed(2)}` });
    }

    // 更新余额（扣除买入金额）
    const newBalance = (balance - cost).toFixed(2);
    db.prepare('UPDATE users SET virtual_balance = ? WHERE id = ?').run(newBalance, req.userId);

    // 更新持仓（合并同名股票）
    const existing = db.prepare('SELECT * FROM positions WHERE user_id = ? AND stock_code = ?').get(req.userId, stockCode);
    if (existing) {
      // 加权平均成本
      const oldShares = Number(existing.shares);
      const oldCost = Number(existing.cost_basis);
      const totalShares = oldShares + buyShares;
      const avgCost = ((oldShares * oldCost) + (buyShares * price)) / totalShares;
      db.prepare('UPDATE positions SET shares = ?, cost_basis = ? WHERE user_id = ? AND stock_code = ?')
        .run(String(round(totalShares, 4)), String(round(avgCost, 4)), req.userId, stockCode);
    } else {
      db.prepare('INSERT INTO positions (user_id, stock_code, shares, cost_basis) VALUES (?, ?, ?, ?)')
        .run(req.userId, stockCode, String(round(buyShares, 4)), String(round(price, 4)));
    }

    // 记录交易
    db.prepare('INSERT INTO trades (user_id, stock_code, stock_name, is_buy, price, shares, amount) VALUES (?, ?, ?, 1, ?, ?, ?)')
      .run(req.userId, stockCode, name, String(round(price, 4)), String(round(buyShares, 4)), String(round(cost, 2)));

    // 返回虚拟交易哈希
    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    res.json({
      success: true,
      txHash,
      message: `买入成功！${buyShares} 股，成交价 ¥${price.toFixed(2)}，花费 ¥${cost.toFixed(2)}`,
    });
  } catch (e) {
    console.error('买入失败:', e);
    res.status(500).json({ error: '买入失败: ' + (e.message?.slice(0, 200) || '未知错误') });
  }
});

// ============ 卖出股票（虚拟交易，不走链） ============
router.post('/sell', authMiddleware, async (req, res) => {
  try {
    const { stockCode, shares, livePrice } = req.body;

    if (!stockCode || !shares) {
      return res.status(400).json({ error: '缺少股票代码或数量' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const price = Math.max(Number(livePrice || 1), 0.01);
    const sellShares = Number(shares);
    const balance = Number(user.virtual_balance || '0');

    // 检查持仓
    const pos = db.prepare('SELECT * FROM positions WHERE user_id = ? AND stock_code = ?').get(req.userId, stockCode);
    if (!pos) {
      return res.status(400).json({ error: '没有该股票的持仓' });
    }

    const heldShares = Number(pos.shares);
    if (sellShares > heldShares) {
      return res.status(400).json({ error: `持仓不足：需要 ${sellShares} 股，持有 ${heldShares} 股` });
    }

    // 计算卖出金额
    const sellAmount = sellShares * price;
    const newBalance = (balance + sellAmount).toFixed(2);

    // 更新余额
    db.prepare('UPDATE users SET virtual_balance = ? WHERE id = ?').run(newBalance, req.userId);

    // 更新持仓
    const remaining = heldShares - sellShares;
    if (remaining <= 0.0001) {
      db.prepare('DELETE FROM positions WHERE user_id = ? AND stock_code = ?').run(req.userId, stockCode);
    } else {
      db.prepare('UPDATE positions SET shares = ? WHERE user_id = ? AND stock_code = ?')
        .run(String(round(remaining, 4)), req.userId, stockCode);
    }

    // 记录交易
    db.prepare('INSERT INTO trades (user_id, stock_code, is_buy, price, shares, amount) VALUES (?, ?, 0, ?, ?, ?)')
      .run(req.userId, stockCode, String(round(price, 4)), String(round(sellShares, 4)), String(round(sellAmount, 2)));

    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    res.json({
      success: true,
      txHash,
      message: `卖出成功！以 ${price.toFixed(2)} USDT 卖出 ${sellShares.toFixed(2)} 股，获得 ${sellAmount.toFixed(2)} USDT`,
    });
  } catch (e) {
    console.error('卖出失败:', e);
    res.status(500).json({ error: '卖出失败: ' + (e.message?.slice(0, 200) || '未知错误') });
  }
});

// 工具：保留指定位数小数
function round(num, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

export default router;
