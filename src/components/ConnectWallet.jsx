import { useState, useEffect } from 'react';
import { checkNetwork, switchToSepolia } from '../config';

export default function ConnectWallet({ onConnect, onDisconnect }) {
  const [account, setAccount]         = useState(null);
  const [error, setError]             = useState(null);
  const [networkOk, setNetworkOk]     = useState(false);
  const [hoverDisc, setHoverDisc]     = useState(false);

  // Verify network on mount
  useEffect(() => {
    if (!window.ethereum) return;
    checkNetwork().then(ok => setNetworkOk(ok)).catch(() => {});
  }, []);

  // MetaMask event listeners
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccs = (accs) => {
      if (accs.length === 0) { setAccount(null); onConnect(null); }
      else                   { setAccount(accs[0]); onConnect(accs[0]); }
    };
    const onChain = () => window.location.reload();
    window.ethereum.on('accountsChanged', onAccs);
    window.ethereum.on('chainChanged', onChain);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccs);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, [onConnect]);

  const handleConnect = async () => {
    setError(null);
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return;
    }
    try {
      const ok = await checkNetwork();
      if (!ok) await switchToSepolia();
      setNetworkOk(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      onConnect(accounts[0]);
    } catch (err) {
      setError(err.code === 4001 ? 'Connection cancelled' : err.message);
    }
  };

  const handleDisconnect = () => {
    setAccount(null);
    if (onDisconnect) onDisconnect();
  };

  if (account) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <button
          className="wallet-btn connected"
          onClick={handleDisconnect}
          onMouseEnter={() => setHoverDisc(true)}
          onMouseLeave={() => setHoverDisc(false)}
        >
          {hoverDisc
            ? <><span>✕</span><span>Disconnect</span></>
            : <><span className="wallet-indicator" /><span className="wallet-address">{account.slice(0,6)}…{account.slice(-4)}</span></>
          }
        </button>
        {networkOk && (
          <span style={{ fontSize: '0.7rem', color: 'var(--emerald-400)', fontWeight: 600 }}>
            ✓ Sepolia
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button className="wallet-btn disconnected" onClick={handleConnect}>
        🔗 Connect MetaMask
      </button>
      {error && (
        <span style={{ fontSize: '0.72rem', color: 'var(--red-400)' }}>{error}</span>
      )}
    </div>
  );
}
