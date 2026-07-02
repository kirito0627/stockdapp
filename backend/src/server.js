import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import tradeRoutes from './routes/trade.js';
import accountRoutes from './routes/account.js';
import { initDB } from './db.js';
import { initContracts } from './contracts.js';

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));

// CORS — 允许各级域名
app.use(cors({ origin: '*' }));
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/account', accountRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 股票行情代理（批量查询全市场实时价格，使用新浪财经接口）
app.get('/api/market/quotes', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const metaPath = path.join(__dirname, '..', 'stock-meta.json');
    
    if (!fs.existsSync(metaPath)) {
      return res.status(503).json({ error: '证券列表未初始化' });
    }
    
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const nameMap = {};
    meta.forEach(s => { nameMap[s.code] = s.name; });
    const codes = meta.map(s => (s.code.startsWith('6') ? 'sh' : 'sz') + s.code);
    
    // 分批并缓存结果
    const CACHE_KEY = 'market_quotes_cache';
    const cache = global[CACHE_KEY] || { data: null, time: 0 };
    const now = Date.now();
    
    // 缓存有效期 2 秒（避免频繁请求）
    if (cache.data && now - cache.time < 2000) {
      return res.json(cache.data);
    }
    
    const BATCH = 500;
    const batches = [];
    for (let i = 0; i < codes.length; i += BATCH) {
      batches.push(codes.slice(i, i + BATCH));
    }
    
    // 并发请求所有批次
    const fetchBatch = async (batch) => {
      const url = `https://hq.sinajs.cn/list=${batch.join(',')}`;
      const r = await fetch(url, { headers: { 'Referer': 'https://finance.sina.com.cn/' } });
      return r.text();
    };
    
    const rawResults = await Promise.all(batches.map(fetchBatch));
    
    // 解析新浪 CSV 格式
    const diff = [];
    for (const txt of rawResults) {
      const lines = txt.split(';\n');
      for (const line of lines) {
        if (!line.includes('hq_str_')) continue;
        // Extract fields from: var hq_str_sz000001="name,open,prevClose,current,high,low,...";
        const match = line.match(/"([^"]+)"/);
        if (!match) continue;
        const fields = match[1].split(',');
        if (fields.length < 10) continue;
        
        const codeMatch = line.match(/hq_str_([a-z]+)(\d+)/);
        if (!codeMatch) continue;
        const code = codeMatch[2];
        const localName = nameMap[code] || fields[0];
        const open = parseFloat(fields[1]) || 0;
        const prevClose = parseFloat(fields[2]) || 0;
        const price = parseFloat(fields[3]) || 0;
        const high = parseFloat(fields[4]) || 0;
        const low = parseFloat(fields[5]) || 0;
        const volume = parseInt(fields[8]) || 0;
        const turnover = parseFloat(fields[9]) || 0;
        
        // 计算涨跌幅
        const changeAmt = prevClose > 0 ? price - prevClose : 0;
        const changePct = prevClose > 0 ? (changeAmt / prevClose) * 100 : 0;
        
        diff.push({
          f12: code,
          f14: localName,
          f2: price,
          f3: changePct,
          f4: changeAmt,
          f5: volume,
          f6: turnover,
          f15: high,
          f16: low,
          f17: open,
          f18: prevClose,
          f20: 0 // mktCap not available from Sina
        });
      }
    }
    
    const result = { data: { diff } };
    global[CACHE_KEY] = { data: result, time: Date.now() };
    res.json(result);
  } catch (e) {
    console.error('行情代理异常:', e.message);
    res.status(502).json({ error: '行情服务异常: ' + e.message });
  }
});

// K 线数据代理（使用新浪财经，更稳定）
app.get('/api/market/kline', async (req, res) => {
  try {
    const { code, scale } = req.query;
    if (!code || !scale) return res.status(400).json({ error: '缺少参数' });
    const prefix = code.startsWith('6') ? 'sh' : 'sz';
    const url = `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketData.getKLineData?symbol=${prefix}${code}&scale=${scale}&ma=5&datalen=200`;
    const r = await fetch(url, { headers: { 'Referer': 'https://finance.sina.com.cn/' } });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    console.error('K线代理异常:', e.message);
    res.status(502).json({ error: 'K线服务异常' });
  }
});

// 静态文件服务（前端 — 仅本地/public 目录存在时启用）
import { existsSync } from 'fs';
const publicPath = join(__dirname, '..', 'public');
if (existsSync(join(publicPath, 'index.html'))) {
  app.use(express.static(publicPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile('index.html', { root: publicPath });
  });
}

// 启动服务（不等待合约初始化，立即监听端口）
async function start() {
  await initDB();

  // 立即启动服务，合约初始化在后台进行
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  StockDApp backend running on http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health`);
    console.log(`========================================\n`);
  });

  // 后台初始化合约（不阻塞服务启动）
  initContracts().catch(err => {
    console.warn('Contracts init failed (non-critical):', err.message);
  });
}

start().catch(e => {
  console.error('Failed to start server:', e);
  process.exit(1);
});
