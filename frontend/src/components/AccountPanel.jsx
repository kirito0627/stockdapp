export default function AccountPanel({ username, usdtBalance, chainBalance, onLogout }) {
  return (
    <div className="account-panel">
      <div className="account-info">
        <div className="info-item">
          <span className="info-label">用户</span>
          <span className="info-value" style={{ fontSize: 14 }}>{username}</span>
        </div>
        <div className="info-item">
          <span className="info-label">钱包余额</span>
          <span className="info-value">{Number(usdtBalance).toFixed(2)}</span>
        </div>
        <div className="info-item">
          <span className="info-label">交易资金</span>
          <span className="info-value green">{Number(chainBalance).toFixed(2)}</span>
        </div>
      </div>
      <div className="account-actions">
        <button className="btn btn-secondary btn-sm" onClick={onLogout}>退出登录</button>
      </div>
    </div>
  );
}
