import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * 交易面板组件 — 通过后端 API 交易，无需 MetaMask
 */
export default function TradePanel({ token, chainStocks, realTimePrices, chainBalance, refreshAccount }) {
  const [selectedStock, setSelectedStock] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [positions, setPositions] = useState([]);

  // 加载持仓
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/account/positions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setPositions(data?.positions || []);
      })
      .catch(() => setPositions([]));
  }, [token, loading, status]);

  const filteredStocks = chainStocks.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.code.includes(q);
  });

  const handleSelect = (code) => {
    setSelectedStock(code);
    setSearchQuery('');
    setSellShares('');
  };

  const selected = chainStocks.find(s => s.code === selectedStock);
  const chainPrice = selected ? Number(selected.price) : 0;
  const rt = selectedStock ? realTimePrices[selectedStock] : null;
  const livePrice = rt?.price || 0;
  const changePct = rt?.changePct || 0;
  const changeAmt = rt?.changeAmt || 0;
  const isUp = changePct >= 0;
  const high = rt?.high || 0;
  const low = rt?.low || 0;
  const open = rt?.open || 0;
  const preClose = rt?.preClose || 0;
  const volume = rt?.volume || 0;
  const turnover = rt?.turnover || 0;

  const tradePrice = livePrice > 0 ? livePrice : chainPrice;

  // 当前选中股票的持仓
  const selectedPosition = positions.find(p => p.code === selectedStock);
  const maxSellShares = selectedPosition ? selectedPosition.shares : 0;
  const avgCost = selectedPosition ? selectedPosition.costBasis : 0;
  const positionProfit = selectedPosition && tradePrice > 0
    ? (tradePrice - avgCost) * selectedPosition.shares
    : 0;
  const positionProfitPct = avgCost > 0 ? ((tradePrice - avgCost) / avgCost) * 100 : 0;

  async function handleBuy() {
    if (!buyAmount || !selectedStock) return;
    setLoading(true);
    setStatus('⏳ 提交买入...');
    try {
      const resp = await fetch(`${API_BASE}/trade/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          stockCode: selectedStock,
          stockName: selected?.name || '',
          shares: buyAmount,
          livePrice,
          changePct,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setStatus('❌ ' + (data.error || '买入失败'));
      } else {
        setStatus(`✅ 买入成功！${buyAmount} 股，成交价 ¥${tradePrice.toFixed(2)}，花费 ¥${(Number(buyAmount) * tradePrice).toFixed(2)}`);
        setBuyAmount('');
        await refreshAccount();
      }
    } catch (e) {
      setStatus('❌ 网络错误');
    }
    setLoading(false);
  }

  async function handleSell() {
    if (!sellShares || !selectedStock) return;
    setLoading(true);
    setStatus('⏳ 提交卖出...');
    try {
      const resp = await fetch(`${API_BASE}/trade/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          stockCode: selectedStock,
          shares: sellShares,
          livePrice,
          changePct,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setStatus('❌ ' + (data.error || '卖出失败'));
      } else {
        setStatus(`✅ 卖出成功！成交价 ¥${tradePrice.toFixed(2)}`);
        setSellShares('');
        await refreshAccount();
      }
    } catch (e) {
      setStatus('❌ 网络错误');
    }
    setLoading(false);
  }

  const estimatedValue = sellShares && tradePrice > 0
    ? (Number(sellShares) * tradePrice).toFixed(2)
    : '0';

  const chainBalNum = Number(chainBalance);

  return (
    <div className="panel">
      {selected && (
        <div className="realtime-quote">
          <div className="quote-header">
            <div className="quote-title-area">
              <span className="quote-name">{selected.code}</span>
              <span className="quote-fullname">{selected?.name || selectedStock}</span>
            </div>
            <div className="quote-price-area">
              <span className="quote-price" style={{ color: isUp ? '#e74c3c' : '#27ae60' }}>
                ¥{(livePrice > 0 ? livePrice : chainPrice).toFixed(2)}
              </span>
              <div className="quote-change-group">
                <span className="quote-change" style={{ color: isUp ? '#e74c3c' : '#27ae60' }}>
                  {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                </span>
                <span className="quote-change-amt" style={{ color: isUp ? '#e74c3c' : '#27ae60' }}>
                  {changeAmt > 0 ? '+' : ''}{changeAmt.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="quote-status">
              <span className="quote-dot"></span>
              实时
            </div>
          </div>

          <div className="quote-details">
            <div className="qd-item"><span className="qd-label">今开</span><span className="qd-val">{open > 0 ? open.toFixed(2) : '--'}</span></div>
            <div className="qd-item"><span className="qd-label">昨收</span><span className="qd-val">{preClose > 0 ? preClose.toFixed(2) : '--'}</span></div>
            <div className="qd-item"><span className="qd-label">最高</span><span className="qd-val" style={{ color: '#e74c3c' }}>{high > 0 ? high.toFixed(2) : '--'}</span></div>
            <div className="qd-item"><span className="qd-label">最低</span><span className="qd-val" style={{ color: '#27ae60' }}>{low > 0 ? low.toFixed(2) : '--'}</span></div>
            <div className="qd-item"><span className="qd-label">成交量</span><span className="qd-val">{volume > 0 ? (volume / 10000).toFixed(0) + '万' : '--'}</span></div>
            <div className="qd-item"><span className="qd-label">成交额</span><span className="qd-val">{turnover > 0 ? (turnover / 100000000).toFixed(2) + '亿' : '--'}</span></div>
          </div>
        </div>
      )}

      <div className="stock-search">
        <label>选择股票</label>
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder={selectedStock ? (selected?.name || '') + ' (' + selectedStock + ')' : '🔍 输入代码或名称搜索...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {selectedStock && !searchQuery && (
            <button className="search-clear" onClick={() => { setSelectedStock(''); setSearchQuery(''); }}>✕</button>
          )}
        </div>
        {searchQuery && (
          <div className="search-results">
            {filteredStocks.length === 0 ? (
              <div className="search-empty">未找到匹配股票</div>
            ) : (
              filteredStocks.slice(0, 50).map(s => {
                const rt = realTimePrices[s.code] || {};
                const isUp = (rt.changePct || 0) >= 0;
                const price = rt.price || Number(s.price) || 0;
                return (
                  <div key={s.code} className="search-item" onClick={() => handleSelect(s.code)}>
                    <div className="si-left">
                      <span className="si-name">{s.name}</span>
                      <span className="si-code">{s.code}</span>
                    </div>
                    <div className="si-right" style={{ color: isUp ? '#e74c3c' : '#27ae60' }}>
                      <span className="si-price">¥{price.toFixed(2)}</span>
                      <span className={`si-pct ${isUp ? 'up' : 'down'}`}>
                        {rt.changePct >= 0 ? '+' : ''}{(rt.changePct || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            {filteredStocks.length > 50 && (
              <div className="search-more">...还有 {filteredStocks.length - 50} 只</div>
            )}
          </div>
        )}
      </div>

      <div className="trade-split">
        <div className="trade-section">
          <h3>🟢 买入</h3>
          <p className="trade-price-label">
            当前价 <span style={{ color: isUp ? '#e74c3c' : '#27ae60', fontWeight: 700, fontSize: 18 }}>
              ¥{tradePrice.toFixed(2)}
            </span>
          </p>
          <div className="form-group">
            <label>买入数量 (股)</label>
            <input type="number" value={buyAmount} onChange={e => setBuyAmount(e.target.value)}
              placeholder="输入股数" step="any" min="100" />
            {buyAmount && tradePrice > 0 && (
              <div className="est-hint">≈ 约 ¥<strong>{(Number(buyAmount) * tradePrice).toFixed(2)}</strong></div>
            )}
          </div>
          <button className="btn btn-buy" onClick={handleBuy}
            disabled={loading || !buyAmount || !selectedStock || chainBalNum < (Number(buyAmount || 0) * tradePrice)}>
            {loading ? '处理中...' : '💰 按实时价买入'}
          </button>
        </div>

        <div className="trade-section">
          <h3>🔴 卖出</h3>
          <p className="trade-price-label">
            当前价 <span style={{ color: isUp ? '#e74c3c' : '#27ae60', fontWeight: 700, fontSize: 18 }}>
              ¥{tradePrice.toFixed(2)}
            </span>
          </p>

          {/* 持仓选择器 */}
          <div className="form-group">
            <label>选择持仓</label>
            <select
              className="position-select"
              value={selectedStock}
              onChange={e => handleSelect(e.target.value)}
            >
              <option value="">-- 选择要卖出的股票 --</option>
              {positions.length === 0 && (
                <option value="" disabled>暂无持仓</option>
              )}
              {positions.map(p => {
                const rt = realTimePrices[p.code] || {};
                const price = rt.price || 0;
                const profit = price > 0 ? (price - p.costBasis) * p.shares : 0;
                const profitPct = p.costBasis > 0 && price > 0 ? ((price - p.costBasis) / p.costBasis) * 100 : 0;
                const isUp = profit >= 0;
                return (
                  <option key={p.code} value={p.code}>
                    {p.code} - 持有 {p.shares} 股 | 成本 ¥{p.costBasis.toFixed(2)} | 现价 ¥{price.toFixed(2)} | 盈亏 {isUp ? '+' : ''}{profit.toFixed(2)} ({isUp ? '+' : ''}{profitPct.toFixed(2)}%)
                  </option>
                );
              })}
            </select>
          </div>

          {selectedPosition && (
            <div className="position-info">
              <div className="pi-row">
                <span>持仓:</span>
                <strong>{selectedPosition.shares} 股</strong>
              </div>
              <div className="pi-row">
                <span>成本价:</span>
                <strong>¥{avgCost.toFixed(2)}</strong>
              </div>
              <div className="pi-row">
                <span>盈亏:</span>
                <strong style={{ color: positionProfit >= 0 ? '#e74c3c' : '#27ae60' }}>
                  {positionProfit >= 0 ? '+' : ''}{positionProfit.toFixed(2)} ({positionProfitPct >= 0 ? '+' : ''}{positionProfitPct.toFixed(2)}%)
                </strong>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>卖出数量 (股)</label>
            <div className="input-with-max">
              <input type="number" value={sellShares} onChange={e => setSellShares(e.target.value)}
                placeholder="输入股数" step="any" max={maxSellShares} />
              {selectedPosition && (
                <button className="max-btn" onClick={() => setSellShares(String(maxSellShares))}>
                  全部
                </button>
              )}
            </div>
            {sellShares && tradePrice > 0 && (
              <div className="est-hint">≈ 约 ¥<strong>{estimatedValue}</strong></div>
            )}
          </div>
          <button className="btn btn-sell" onClick={handleSell}
            disabled={loading || !sellShares || !selectedStock || Number(sellShares) > maxSellShares}>
            {loading ? '处理中...' : '按实时价卖出'}
          </button>
        </div>
      </div>

      {status && (
        <div className={`status ${status.startsWith('✅') ? 'status-ok' : status.startsWith('❌') ? 'status-err' : 'status-wait'}`}>
          {status}
        </div>
      )}
    </div>
  );
}
