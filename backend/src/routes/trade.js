import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDB, queryOne, queryMany, run } from '../db.js';

const router = Router();

function round(num, decimals = 4) {
  return Number(Number(num).toFixed(decimals));
}

// ============ 买入股票（按股数，虚拟交易，不走链） ============
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { stockCode, stockName, shares, livePrice } = req.body;

    if (!stockCode || !shares) {
      return res.status(400).json({ error: '缺少股票代码或股数' });
    }

    const db = getDB();
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.userId]);
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
    await run('UPDATE users SET virtual_balance = $1 WHERE id = $2', [newBalance, req.userId]);

    // 更新持仓（合并同名股票）
    const existing = await queryOne('SELECT * FROM positions WHERE user_id = $1 AND stock_code = $2', [req.userId, stockCode]);
    if (existing) {
      // 加权平均成本
      const oldShares = Number(existing.shares);
      const oldCost = Number(existing.cost_basis);
      const totalShares = oldShares + buyShares;
      const avgCost = ((oldShares * oldCost) + (buyShares * price)) / totalShares;
      await run(
        'UPDATE positions SET shares = $1, cost_basis = $2 WHERE user_id = $3 AND stock_code = $4',
        [String(round(totalShares, 4)), String(round(avgCost, 4)), req.userId, stockCode]
      );
    } else {
      await run(
        'INSERT INTO positions (user_id, stock_code, shares, cost_basis) VALUES ($1, $2, $3, $4)',
        [req.userId, stockCode, String(round(buyShares, 4)), String(round(price, 4))]
      );
    }

    // 记录交易
    await run(
      'INSERT INTO trades (user_id, stock_code, stock_name, is_buy, price, shares, amount) VALUES ($1, $2, $3, 1, $4, $5, $6)',
      [req.userId, stockCode, name, String(round(price, 4)), String(round(buyShares, 4)), String(round(cost, 2))]
    );

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
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const sellShares = Number(shares);
    const price = Math.max(Number(livePrice || 1), 0.01);
    const position = await queryOne('SELECT * FROM positions WHERE user_id = $1 AND stock_code = $2', [req.userId, stockCode]);

    if (!position) {
      return res.status(400).json({ error: '未持有该股票' });
    }

    const holdingShares = Number(position.shares);
    if (sellShares > holdingShares) {
      return res.status(400).json({ error: `卖出数量超过持仓：持有 ${holdingShares} 股` });
    }

    const amount = sellShares * price;
    const newShares = holdingShares - sellShares;
    const balance = Number(user.virtual_balance || '0');
    const newBalance = (balance + amount).toFixed(2);

    if (newShares <= 0) {
      await run('DELETE FROM positions WHERE user_id = $1 AND stock_code = $2', [req.userId, stockCode]);
    } else {
      await run(
        'UPDATE positions SET shares = $1 WHERE user_id = $2 AND stock_code = $3',
        [String(round(newShares, 4)), req.userId, stockCode]
      );
    }

    await run('UPDATE users SET virtual_balance = $1 WHERE id = $2', [newBalance, req.userId]);

    await run(
      'INSERT INTO trades (user_id, stock_code, stock_name, is_buy, price, shares, amount) VALUES ($1, $2, $3, 0, $4, $5, $6)',
      [req.userId, stockCode, stockCode, String(round(price, 4)), String(round(sellShares, 4)), String(round(amount, 2))]
    );

    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    res.json({
      success: true,
      txHash,
      message: `卖出成功！${sellShares} 股，成交价 ¥${price.toFixed(2)}，收入 ¥${amount.toFixed(2)}`,
    });
  } catch (e) {
    console.error('卖出失败:', e);
    res.status(500).json({ error: '卖出失败: ' + (e.message?.slice(0, 200) || '未知错误') });
  }
});

export default router;
