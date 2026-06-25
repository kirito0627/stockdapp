import { useState, useEffect } from 'react';

export default function ConnectWallet({ account, chainBalance }) {
  const [shortAddr, setShortAddr] = useState('');

  useEffect(() => {
    if (account) {
      setShortAddr(`${account.slice(0, 6)}...${account.slice(-4)}`);
    }
  }, [account]);

  if (!account) return null;

  return (
    <div className="wallet-connected">
      <span className="wallet-dot"></span>
      <span className="wallet-address">{shortAddr}</span>
      <span className="wallet-label">Ganache</span>
    </div>
  );
}
