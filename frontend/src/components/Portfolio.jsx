import { useState, useEffect, useRef } from 'react';
import KlineChart from './KlineChart';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Portfolio({ token, chainStocks }) {
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  function getStockName(code) {
    if (!chainStocks || chainStocks.length === 0) return code;
    const found = chainStocks.find(s => s.code === code);
    return found?.name || code;
  }

  useEffect(() => {
    if (!token || initialized.current) return;
    initialized.current = true;
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [posRes, tradeRes] = await Promise.all([
        fetch(`${API_BASE}/account/positions`, { headers }),
        fetch(`${API_BASE}/account/trades`, { headers })
      ]);
      if (posRes.ok) {
        const posData = await posRes.json();
        setPositions(posData.positions || []);
      }
      if (tradeRes.ok) {
        const tradeData = await tradeRes.json();
        setTrades(tradeData.trades || []);
      }
    } catch (e) {
      console.warn('加载失败:', e.message);
    } finally {
      setLoading(false);
    }
  }

  const [klineStock, setKlineStock] = useState(null);

  if (loading) {
    return (
      <div className="pf-container">
        <div className="pf-loading">
          <div className="pf-spinner"></div>
          <span>加载持仓数据...</span>
        </div>
      </div>
    );
  }

  const totalValue = positions.reduce((sum, p) => sum + (p.marketValue || 0), 0);
  const totalCost = positions.reduce((sum, p) => sum + (p.costBasis * p.shares || 0), 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost * 100) : 0;

  return (
    <div className="pf-container">
      {/* K线弹窗 */}
      {klineStock && (
        <KlineChart
          code={klineStock.code}
          name={getStockName(klineStock.code)}
          onClose={() => setKlineStock(null)}
        />
      )}

      {/* 持仓概览卡片 */}
      <div className="pf-overview">
        <div className="pf-overview-header">
          <span className="pf-overview-icon">💼</span>
          <span className="pf-overview-title">我的持仓</span>
          <span className="pf-overview-count">{positions.length} 只</span>
        </div>

        {positions.length > 0 ? (
          <div className="pf-summary-row">
            <div className="pf-stat-card">
              <div className="pf-stat-label">总市值</div>
              <div className="pf-stat-value">¥{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="pf-stat-card">
              <div className="pf-stat-label">总成本</div>
              <div className="pf-stat-value">¥{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className={`pf-stat-card ${totalProfit >= 0 ? 'pf-profit-up' : 'pf-profit-down'}`}>
              <div className="pf-stat-label">总盈亏</div>
              <div className="pf-stat-value pf-profit-val">
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                <span className="pf-profit-pct">({totalProfitPct >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="pf-empty">
            <span className="pf-empty-icon">📊</span>
            <p>暂无持仓</p>
            <span>去交易页买入第一只股票吧</span>
          </div>
        )}
      </div>

      {/* 持仓列表 */}
      {positions.length > 0 && (
        <div className="pf-section">
          <div className="pf-section-title">
            <span className="pf-section-icon">📋</span>持仓明细
          </div>

          <div className="pf-table-wrap">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>股票</th>
                  <th className="tc-r">数量</th>
                  <th className="tc-r">成本价</th>
                  <th className="tc-r">现价</th>
                  <th className="tc-r">市值</th>
                  <th className="tc-r">盈亏</th>
                  <th className="tc-c"></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const profit = (p.currentPrice - p.costBasis) * p.shares;
                  const profitPct = p.costBasis > 0 ? ((p.currentPrice - p.costBasis) / p.costBasis * 100) : 0;
                  const isUp = profit >= 0;
                  const name = getStockName(p.code);

                  return (
                    <tr key={p.code}>
                      <td>
                        <div className="pf-stock-name">{name}</div>
                        <div className="pf-stock-code">{p.code}</div>
                      </td>
                      <td className="tc-r">{Number(p.shares).toLocaleString()}</td>
                      <td className="tc-r">¥{p.costBasis.toFixed(2)}</td>
                      <td className={`tc-r pf-price-${isUp ? 'up' : 'down'}`}>¥{p.currentPrice.toFixed(2)}</td>
                      <td className="tc-r">¥{(p.marketValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={`tc-r pf-pnl-${isUp ? 'up' : 'down'}`}>
                        {isUp ? '+' : ''}{profit.toFixed(2)}
                        <span className="pf-pnl-pct"> ({isUp ? '+' : ''}{profitPct.toFixed(2)}%)</span>
                      </td>
                      <td className="tc-c">
                        <button
                          className="pf-kline-btn"
                          onClick={() => setKlineStock({ code: p.code, name })}
                          title="查看K线"
                        >
                          📈
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 交易记录 */}
      {trades.length > 0 && (
        <div className="pf-section">
          <div className="pf-section-title">
            <span className="pf-section-icon">📜</span>最近交易
          </div>

          <div className="pf-table-wrap">
            <table className="pf-table pf-trade-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>股票</th>
                  <th className="tc-c">方向</th>
                  <th className="tc-r">价格</th>
                  <th className="tc-r">数量</th>
                  <th className="tc-r">金额</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={i}>
                    <td><span className="pf-time">{t.time || '--'}</span></td>
                    <td>{getStockName(t.code)}</td>
                    <td className="tc-c">
                      <span className={`pf-dir-tag ${t.isBuy ? 'pf-buy' : 'pf-sell'}`}>
                        {t.isBuy ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="tc-r">¥{t.price.toFixed(2)}</td>
                    <td className="tc-r">{Number(t.shares).toLocaleString()}</td>
                    <td className="tc-r">¥{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
