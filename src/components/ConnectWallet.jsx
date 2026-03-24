import { useState, useEffect } from 'react';
import { checkNetwork, switchToSepolia } from '../config';

export default function ConnectWallet({ onConnect, onDisconnect, currentAccount }) {
  const [account, setAccount]     = useState(currentAccount || null);
  const [error, setError]         = useState(null);
  const [networkOk, setNetworkOk] = useState(false);
  const [hoverDisc, setHoverDisc] = useState(false);

  // Sync with parent account (e.g. after page switch causes remount)
  useEffect(() => {
    if (currentAccount && currentAccount !== account) {
      setAccount(currentAccount);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount]);

  // Verify network on mount and also restore connection if already connected
  useEffect(() => {
    if (!window.ethereum) return;
    checkNetwork().then(ok => setNetworkOk(ok)).catch(() => {});

    // Auto-restore: if MetaMask already has accounts (user didn't disconnect)
    window.ethereum.request({ method: 'eth_accounts' }).then(accs => {
      if (accs.length > 0 && !account) {
        setAccount(accs[0]);
        onConnect(accs[0]);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {networkOk && (
          <span style={{ fontSize: '0.72rem', color: 'var(--green-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sepolia
          </span>
        )}
        <button
          className="wallet-btn connected"
          style={{ padding: '6px 12px' }}
          onClick={handleDisconnect}
          onMouseEnter={() => setHoverDisc(true)}
          onMouseLeave={() => setHoverDisc(false)}
        >
          {hoverDisc
            ? <><span style={{ fontSize: '10px' }}>&#x2715;</span><span>Disconnect</span></>
            : <><span className="wallet-indicator" /><span className="wallet-address">{account.slice(0, 6)}…{account.slice(-4)}</span></>
          }
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button className="wallet-btn disconnected" onClick={handleConnect}>
        Connect MetaMask
      </button>
      {error && (
        <span style={{ fontSize: '0.72rem', color: 'var(--red-600)' }}>{error}</span>
      )}
    </div>
  );
}
