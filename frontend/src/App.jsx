import { useState, useEffect, useCallback, useRef } from 'react';
import Login from './components/Login';
import StockList from './components/StockList';
import TradePanel from './components/TradePanel';
import Portfolio from './components/Portfolio';
import AccountPanel from './components/AccountPanel';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// A 股实时行情 API — 通过后端代理（避免跨域/兼容问题）
const EASTMONEY_API = ''; // 不再直接使用

// 大盘指数（通过后端代理获取，兼容行情页面）
const INDEX_API = ''; // 不再直接调用，从市场行情中提取

function App() {
  const [token, setToken] = useState(localStorage.getItem('stockdapp_token') || '');
  const [userInfo, setUserInfo] = useState(() => {
    const saved = localStorage.getItem('stockdapp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('stocks');
  const [realTimePrices, setRealTimePrices] = useState({});
  const [indexData, setIndexData] = useState([]);
  const [chainStocks, setChainStocks] = useState([]);
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [chainBalance, setChainBalance] = useState('0');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [showFundingOverlay, setShowFundingOverlay] = useState(false);
  const fundingTimeoutRef = useRef(null);

  // 时钟
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const now = currentTime;
  const day = now.getDay();
  const hour = now.getHours();
  const min = now.getMinutes();
  const totalMin = hour * 60 + min;
  const isWeekday = day >= 1 && day <= 5;
  const isMarketOpen = isWeekday && totalMin >= 570 && totalMin <= 900;
  const marketStatus = isWeekday ? (isMarketOpen ? '交易中' : '已休市') : '休市';
  const marketColor = isMarketOpen ? '#27ae60' : '#888';

  // 加载股票列表（从本地静态文件，快速显示）
  useEffect(() => {
    fetch('/stock-meta.json')
      .then(r => r.json())
      .then(meta => {
        if (meta && meta.length > 0) {
          setChainStocks(meta.map(s => ({ code: s.code, name: s.name, price: 0 })));
        }
      })
      .catch(() => {});
  }, []);

  // 拉取大盘指数（空实现，东方财富 API 被限速时跳过）
  const fetchIndexData = useCallback(async () => {
    // 暂时跳过，可后续从行情数据中提取指数
  }, []);

  // 拉取全市场实时行情（通过后端代理）
  const fetchRealTimePrices = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/market/quotes`);
      const data = await resp.json();
      if (data?.data?.diff) {
        const prices = {};
        for (const item of data.data.diff) {
          const code = item.f12;
          const name = item.f14 || code;
          prices[code] = {
            name,
            price: item.f2 || 0,
            changePct: item.f3 || 0,
            changeAmt: item.f4 || 0,
            volume: item.f5 || 0,
            turnover: item.f6 || 0,
            turnoverRate: (item.f8 || 0) / 100,
            pe: item.f9 || 0,
            high: item.f15 || 0,
            low: item.f16 || 0,
            open: item.f17 || 0,
            preClose: item.f18 || 0,
            mktCap: item.f20 || 0
          };
        }
        setRealTimePrices(prices);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.warn('获取行情失败:', e.message);
    }
  }, []);

  // 从后端获取账户余额
  const refreshAccount = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await fetch(`${API_BASE}/account/balance`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (resp.status === 401) {
        handleLogout();
        return;
      }
      const data = await resp.json();
      if (data.usdtBalance !== undefined) {
        setUsdtBalance(data.usdtBalance);
        setChainBalance(data.chainBalance);
        // 资金到账后自动关闭 overlay
        if (Number(data.usdtBalance) > 0 || Number(data.chainBalance) > 0) {
          setShowFundingOverlay(false);
          if (fundingTimeoutRef.current) {
            clearTimeout(fundingTimeoutRef.current);
            fundingTimeoutRef.current = null;
          }
        }
      }
    } catch (e) {
      console.warn('获取余额失败（后端可能未启动）:', e.message);
    }
  }, [token]);

  // 初始化加载
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRealTimePrices(), fetchIndexData(), token ? refreshAccount() : Promise.resolve()])
      .finally(() => setLoading(false));
  }, [token]);

  // 定时刷新行情 + 指数 + 余额
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealTimePrices();
      fetchIndexData();
      if (token) refreshAccount();
    }, 3000);
    return () => clearInterval(interval);
  }, [token, fetchRealTimePrices, fetchIndexData, refreshAccount]);

  function handleLogin(newToken, user, isRegistering) {
    setToken(newToken);
    setUserInfo(user);
    if (isRegistering) {
      // 注册后显示资金到账提示
      setShowFundingOverlay(true);
      // 60 秒后自动关闭（防止没到账就一直卡着）
      if (fundingTimeoutRef.current) clearTimeout(fundingTimeoutRef.current);
      fundingTimeoutRef.current = setTimeout(() => {
        setShowFundingOverlay(false);
      }, 60000);
    }
  }

  function handleLogout() {
    localStorage.removeItem('stockdapp_token');
    localStorage.removeItem('stockdapp_user');
    setToken('');
    setUserInfo(null);
    setUsdtBalance('0');
    setChainBalance('0');
  }

  const tabClass = (tab) => `tab-btn ${currentTab === tab ? 'tab-active' : ''}`;

  // 未登录 → 显示登录页
  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  // 加载中
  if (loading && chainStocks.length === 0) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">📈 A股模拟</h1>
        </header>
        <div className="loading">🔄 正在加载...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 资金到账 overlay */}
      {showFundingOverlay && (
        <div className="funding-overlay">
          <div className="funding-card">
            <div className="funding-spinner"></div>
            <h2>🔄 资金正在到账中</h2>
            <p>您的 1,000,000 USDT 模拟资金已到账，祝您投资愉快！</p>
            <p className="funding-hint">虚拟交易系统，实时行情来自东方财富</p>
            <div className="funding-status">
              <div className="funding-row">
                <span>钱包余额</span>
                <span className={Number(usdtBalance) > 0 ? 'green' : 'gray'}>{Number(usdtBalance).toFixed(2)} USDT</span>
              </div>
              <div className="funding-row">
                <span>交易资金</span>
                <span className={Number(chainBalance) > 0 ? 'green' : 'gray'}>{Number(chainBalance).toFixed(2)} USDT</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowFundingOverlay(false)}>
              跳过等待，直接进入
            </button>
          </div>
        </div>
      )}

      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">📈 A股模拟 DApp</h1>
          <span className="app-sub-title">去中心化模拟炒股</span>
        </div>
        <div className="header-center">
          <div className="header-clock">
            {currentTime.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            <span className="clock-time">{currentTime.toLocaleTimeString('zh-CN', { hour12: false })}</span>
          </div>
          <div className="market-status" style={{ color: marketColor }}>
            <span className="status-dot" style={{ background: marketColor }}></span>
            {marketStatus}
          </div>
        </div>
        <div className="header-right">
          <AccountPanel
            username={userInfo?.username}
            usdtBalance={usdtBalance}
            chainBalance={chainBalance}
            onLogout={handleLogout}
          />
        </div>
      </header>

      <nav className="tab-nav">
        <button className={tabClass('stocks')} onClick={() => setCurrentTab('stocks')}>📊 行情</button>
        <button className={tabClass('trade')} onClick={() => setCurrentTab('trade')}>💹 交易</button>
        <button className={tabClass('portfolio')} onClick={() => setCurrentTab('portfolio')}>📦 持仓</button>
      </nav>

      <main className="app-main">
        {currentTab === 'stocks' && (
          <StockList
            chainStocks={chainStocks}
            realTimePrices={realTimePrices}
            lastUpdateTime={lastUpdateTime}
            indexData={indexData}
          />
        )}
        {currentTab === 'trade' && (
          <TradePanel
            token={token}
            chainStocks={chainStocks}
            realTimePrices={realTimePrices}
            chainBalance={chainBalance}
            refreshAccount={refreshAccount}
          />
        )}
        {currentTab === 'portfolio' && (
          <Portfolio
            token={token}
            realTimePrices={realTimePrices}
            chainStocks={chainStocks}
          />
        )}
      </main>

      <footer className="app-footer">
        StockDApp · 区块链模拟炒股 DApp · 数据来源 东方财富 · {currentTime.toLocaleDateString('zh-CN')}
      </footer>
    </div>
  );
}

export default App;
