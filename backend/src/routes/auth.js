import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ethers } from 'ethers';
import { getDB, queryOne, run } from '../db.js';
import { createUserWallet } from '../contracts.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// ============ 注册 ============
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度 2-20 个字符' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    const db = getDB();

    // 检查用户名是否已存在
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    // 创建链上钱包
    const walletInfo = await createUserWallet();

    // 加密密码
    const passwordHash = bcrypt.hashSync(password, 10);

    // 存入数据库（含 1,000,000 虚拟余额）
    const result = await db.query(
      `INSERT INTO users (username, password_hash, wallet_address, encrypted_private_key, virtual_balance)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [username, passwordHash, walletInfo.address, walletInfo.encryptedPrivateKey, '1000000']
    );

    const userId = result.rows[0].id;
    const token = generateToken(userId, username);

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        username,
        walletAddress: walletInfo.address,
      },
    });
  } catch (e) {
    console.error('注册失败:', e);
    res.status(500).json({ error: '注册失败: ' + e.message });
  }
});

// ============ 登录 ============
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = await queryOne('SELECT * FROM users WHERE username = $1', [username]);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken(user.id, user.username);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        walletAddress: user.wallet_address,
      },
    });
  } catch (e) {
    console.error('登录失败:', e);
    res.status(500).json({ error: '登录失败' });
  }
});

// ============ 获取当前用户信息 ============
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, username, wallet_address FROM users WHERE id = $1', [req.userId]);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      id: user.id,
      username: user.username,
      walletAddress: user.wallet_address,
    });
  } catch (e) {
    console.error('获取用户信息失败:', e);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;
