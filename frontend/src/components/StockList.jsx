import { useState, useMemo } from 'react';
import KlineChart from './KlineChart';

/**
 * 股票行情列表 — 带涨幅榜/跌幅榜 + K 线图查看功能
 */
export default function StockList({ chainStocks, realTimePrices, lastUpdateTime, indexData }) {
  const [klineStock, setKlineStock] = useState(null);

  // 合并链上数据与实时行情
  const merged = useMemo(() => {
    if (!chainStocks || chainStocks.length === 0) return [];
    return chainStocks.map(s => {
      const rt = realTimePrices[s.code] || {};
      const price = rt.price || Number(s.price) / 1e18 || 0;
      return {
        code: s.code,
        name: s.name,
        price,
        changePct: rt.changePct || 0,
        changeAmt: rt.changeAmt || 0,
        high: rt.high || 0,
        low: rt.low || 0,
        open: rt.open || 0,
        preClose: rt.preClose || 0,
        volume: rt.volume || 0,
        turnover: rt.turnover || 0,
      };
    });
  }, [chainStocks, realTimePrices]);

  // 涨幅榜 Top10（降序）
  const gainers = useMemo(() =>
    [...merged].sort((a, b) => b.changePct - a.changePct).slice(0, 10),
  [merged]);

  // 跌幅榜 Top10（升序）
  const losers = useMemo(() =>
    [...merged].sort((a, b) => a.changePct - b.changePct).slice(0, 10),
  [merged]);

  if (merged.length === 0) {
    return <div className="panel"><h2>📊 行情总览</h2><p className="panel-desc">暂无股票数据</p></div>;
  }

  // 渲染排行榜行
  const renderRankRow = (stock, rank) => {
    const isUp = stock.changePct >= 0;
    const color = isUp ? '#e74c3c' : '#27ae60';
    return (
      <tr key={stock.code} className="rank-row" onClick={() => setKlineStock(stock)}>
        <td className="col-center rank-num">{rank}</td>
        <td>
          <div className="stock-cell-name">
            <span className="sc-name">{stock.name}</span>
            <span className="sc-code">{stock.code}</span>
          </div>
        </td>
        <td className="col-right" style={{ color, fontWeight: 700 }}>{stock.price.toFixed(2)}</td>
        <td className="col-right">
          <span className={`tag-pct ${isUp ? 'up' : 'down'}`}>
            {isUp ? '+' : ''}{stock.changePct.toFixed(2)}%
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="panel">
      <h2>📊 A 股行情</h2>
      <p className="panel-desc">
        实时数据来源：东方财富 | 共 {merged.length} 只
        {lastUpdateTime && <span className="update-time"> 更新于 {lastUpdateTime}</span>}
      </p>

      {/* 大盘指数 */}
      {indexData && indexData.length > 0 && (
        <div className="index-bar">
          {indexData.map(idx => {
            const isUp = idx.changePct >= 0;
            const color = isUp ? '#e74c3c' : '#27ae60';
            return (
              <div key={idx.code} className="index-card">
                <div className="idx-name">{idx.name}</div>
                <div className="idx-price" style={{ color }}>
                  {idx.price.toFixed(2)}
                </div>
                <div className="idx-change" style={{ color }}>
                  {isUp ? '+' : ''}{idx.changePct.toFixed(2)}%
                  <span className="idx-amt">
                    {isUp ? '+' : ''}{idx.changeAmt.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 涨幅榜 / 跌幅榜 */}
      <div className="rankboards">
        <div className="rankboard rank-gainers">
          <h3 className="rank-title">🔴 涨幅榜 TOP 10</h3>
          <table className="rank-table">
            <thead>
              <tr>
                <th className="col-center">#</th>
                <th>名称/代码</th>
                <th className="col-right">最新价</th>
                <th className="col-right">涨跌幅</th>
              </tr>
            </thead>
            <tbody>
              {gainers.map((s, i) => renderRankRow(s, i + 1))}
            </tbody>
          </table>
        </div>
        <div className="rankboard rank-losers">
          <h3 className="rank-title rank-title-green">🟢 跌幅榜 TOP 10</h3>
          <table className="rank-table">
            <thead>
              <tr>
                <th className="col-center">#</th>
                <th>名称/代码</th>
                <th className="col-right">最新价</th>
                <th className="col-right">涨跌幅</th>
              </tr>
            </thead>
            <tbody>
              {losers.map((s, i) => renderRankRow(s, i + 1))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 完整行情表 */}
      <h3 className="section-sub-title">📋 全部行情</h3>
      <div className="stock-table-wrap">
        <table className="stock-table">
          <thead>
            <tr>
              <th>代码/名称</th>
              <th className="col-right">最新价</th>
              <th className="col-right">涨跌幅</th>
              <th className="col-right">涨跌额</th>
              <th className="col-right">最高</th>
              <th className="col-right">最低</th>
              <th className="col-right">昨收</th>
              <th className="col-right">成交量</th>
              <th className="col-center">K线</th>
            </tr>
          </thead>
          <tbody>
            {merged.map(stock => {
              const isUp = stock.changePct >= 0;
              const color = isUp ? '#e74c3c' : '#27ae60';

              return (
                <tr key={stock.code} className="stock-row">
                  <td>
                    <div className="stock-cell-name">
                      <span className="sc-name">{stock.name}</span>
                      <span className="sc-code">{stock.code}</span>
                    </div>
                  </td>
                  <td className="col-right" style={{ color, fontWeight: 700 }}>
                    {stock.price.toFixed(2)}
                  </td>
                  <td className="col-right" style={{ color }}>
                    <span className={`tag-pct ${isUp ? 'up' : 'down'}`}>
                      {isUp ? '+' : ''}{stock.changePct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="col-right" style={{ color }}>
                    {stock.changeAmt.toFixed(2)}
                  </td>
                  <td className="col-right">{stock.high > 0 ? stock.high.toFixed(2) : '--'}</td>
                  <td className="col-right">{stock.low > 0 ? stock.low.toFixed(2) : '--'}</td>
                  <td className="col-right">{stock.preClose > 0 ? stock.preClose.toFixed(2) : '--'}</td>
                  <td className="col-right">
                    {stock.volume > 0 ? (stock.volume / 10000).toFixed(0) + '万' : '--'}
                  </td>
                  <td className="col-center">
                    <button className="btn-kline" onClick={() => setKlineStock(stock)}>
                      📈
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* K 线图弹窗 */}
      {klineStock && (
        <KlineChart
          code={klineStock.code}
          name={klineStock.name}
          onClose={() => setKlineStock(null)}
        />
      )}
    </div>
  );
}
