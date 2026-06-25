import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const PERIODS = [
  { key: '1m',  label: '1分',  scale: '1',    intraday: true },
  { key: '5m',  label: '5分',  scale: '5',    intraday: true },
  { key: '15m', label: '15分', scale: '15',   intraday: true },
  { key: '30m', label: '30分', scale: '30',   intraday: true },
  { key: '60m', label: '60分', scale: '60',   intraday: true },
  { key: '1d',  label: '日K',  scale: '240',  intraday: false },
  { key: '1w',  label: '周K',  scale: '1200', intraday: false },
  { key: '1M',  label: '月K',  scale: '7200', intraday: false },
];

export default function KlineChart({ code, name, onClose }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [period, setPeriod] = useState('1d');

  useEffect(() => {
    if (!code || !containerRef.current) return;

    let cancelled = false;
    const p = PERIODS.find(x => x.key === period);
    if (!p) return;

    // 清除旧图表
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = 400;

    // 创建图表
    const chart = createChart(container, {
      width,
      height,
      layout: { background: { color: '#1a1a2e' }, textColor: '#ccc' },
      grid: {
        vertLines: { color: '#2a2a4a' },
        horzLines: { color: '#2a2a4a' },
      },
    });
    chartRef.current = chart;

    // 获取K线数据
    console.log('[Kline] Fetching:', `${API_BASE}/market/kline?code=${code}&scale=${p.scale}`);
    fetch(`${API_BASE}/market/kline?code=${code}&scale=${p.scale}`)
      .then(r => { console.log('[Kline] Response status:', r.status); return r.json(); })
      .then(data => {
        console.log('[Kline] Data received:', data?.length, 'items');
        if (cancelled || !data || !Array.isArray(data) || data.length === 0) { console.log('[Kline] No data'); return; }

        const cdata = data.map(item => {
          const rawTime = item.day;
          const time = p.intraday
            ? Math.floor(new Date(rawTime).getTime() / 1000)
            : rawTime.split(' ')[0];
          return {
            time,
            open:  parseFloat(item.open),
            high:  parseFloat(item.high),
            low:   parseFloat(item.low),
            close: parseFloat(item.close),
          };
        });

        const vdata = data.map(item => {
          const rawTime = item.day;
          const time = p.intraday
            ? Math.floor(new Date(rawTime).getTime() / 1000)
            : rawTime.split(' ')[0];
          const open  = parseFloat(item.open);
          const close = parseFloat(item.close);
          return {
            time,
            value: parseInt(item.volume) || 0,
            color: close >= open ? '#e74c3c80' : '#27ae6080',
          };
        });

        const cs = chart.addCandlestickSeries({
          upColor: '#e74c3c', downColor: '#27ae60',
          borderUpColor: '#e74c3c', borderDownColor: '#27ae60',
          wickUpColor: '#e74c3c', wickDownColor: '#27ae60',
        });
        cs.setData(cdata);
        chart.timeScale().fitContent();

        const vs = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: '',
        });
        chart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        vs.setData(vdata);
      })
      .catch(err => console.error('Kline fetch error:', err));

    // 窗口resize自适应
    const onResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth || 600 });
      }
    };
    window.addEventListener('resize', onResize);

    // 清理函数
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [code, period]);

  return (
    <div className="kline-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="kline-modal">
        <div className="kline-header">
          <div className="kline-title">
            <span className="kline-name">{name}</span>
            <span className="kline-code">{code}</span>
          </div>
          <button className="kline-close" onClick={onClose}>✕</button>
        </div>

        <div className="kline-periods">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`kp-btn ${period === p.key ? 'kp-active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="kline-body" style={{ width: '100%', overflow: 'hidden' }}>
          <div ref={containerRef} style={{ width: '100%', height: 400 }} />
        </div>
      </div>
    </div>
  );
}
