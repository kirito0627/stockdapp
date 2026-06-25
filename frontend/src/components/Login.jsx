import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 滚动行情占位
const TICKER_TEXT = 'A股模拟炒股 ｜ 注册即赠 100 万 USDT 模拟资金 ｜ 5200+ 只股票实时行情 ｜ 零风险模拟交易 ｜ 去中心化钱包技术 ｜ ';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || '操作失败');
        return;
      }
      localStorage.setItem('stockdapp_token', data.token);
      localStorage.setItem('stockdapp_user', JSON.stringify(data.user));
      onLogin(data.token, data.user, mode === 'register');
    } catch (e) {
      setError('网络错误，请检查后端服务是否启动');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      {/* 背景装饰 */}
      <div className="login-bg">
        <div className="bg-circle c1"></div>
        <div className="bg-circle c2"></div>
        <div className="bg-circle c3"></div>
      </div>

      {/* 滚动行情条 */}
      <div className="login-ticker">
        <div className="ticker-track">
          <span>{TICKER_TEXT}</span>
          <span>{TICKER_TEXT}</span>
        </div>
      </div>

      <div className="login-container">
        <div className="login-card">
          {/* Logo 区域 */}
          <div className="login-logo">
            <div className="logo-icon">📈</div>
          </div>
          <h1 className="login-title">A股模拟 DApp</h1>
          <p className="login-subtitle">模拟炒股平台 · 注册即赠 100 万 USDT</p>

          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              <span className="tab-icon">🔑</span> 登录
            </button>
            <button
              className={`login-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              <span className="tab-icon">✨</span> 注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>
                <span className="input-icon">👤</span> 用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="2-20 个字符"
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>
                <span className="input-icon">🔒</span> 密码
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <><span className="btn-spinner"></span> 处理中...</>
              ) : mode === 'login' ? (
                '🔑 登录'
              ) : (
                '🚀 注册并获取 100 万 USDT'
              )}
            </button>
          </form>

          {mode === 'register' && (
            <div className="login-features">
              <div className="feature-item">
                <span className="feature-icon">💰</span>
                <span>注册即赠 <strong>1,000,000 USDT</strong></span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>5,200+ 只 A 股实时行情</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>零风险模拟交易，即刻开始</span>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="login-footer">
              <span>还没有账号？</span>
              <button className="link-btn" onClick={() => { setMode('register'); setError(''); }}>
                立即注册 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
