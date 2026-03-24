import { useState, useEffect } from 'react';
import ConnectWallet from './components/ConnectWallet';
import BorrowerDashboard from './components/BorrowerDashboard';
import LenderDashboard from './components/LenderDashboard';
import { useBlockchain } from './hooks/useBlockchain';
import './App.css';

/**
 * Pages:
 *  'home'     → Landing / role selection
 *  'borrower' → Borrower dashboard
 *  'lender'   → Lender dashboard
 */
function App() {
  const [page, setPage]       = useState('home');
  const [account, setAccount] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sparks, setSparks] = useState([]);
  const { contract, error: blockchainError, initializeProvider } = useBlockchain();

  // Mouse trail & Spark generation
  useEffect(() => {
    let lastPos = { x: 0, y: 0 };
    
    const handleMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      // Calculate distance from last spark to avoid over-spawning
      const dist = Math.hypot(e.clientX - lastPos.x, e.clientY - lastPos.y);
      if (dist > 8) {
        const idBase = Date.now();
        const colors = [
          '#fbbf24', '#fde047', '#ffed4a', '#fb923c', '#ffd700', '#ffff00'
        ];
        
        // Spawn a "burst" of 5 smaller splashing sparks
        const newBurst = Array.from({ length: 5 }).map((_, i) => ({
          id: `${idBase}-${i}`,
          x: e.clientX,
          y: e.clientY,
          size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
          color: colors[Math.floor(Math.random() * colors.length)],
          tx: (Math.random() * 80 - 40), // Random splash X
          ty: (Math.random() * 80 - 40), // Random splash Y
          delay: Math.random() * 0.2
        }));
        
        setSparks(prev => [...prev.slice(-80), ...newBurst]); // Keep last 80 smaller sparks
        lastPos = { x: e.clientX, y: e.clientY };
        
        // Auto-remove after animation
        setTimeout(() => {
          const idsToRemove = newBurst.map(b => b.id);
          setSparks(prev => prev.filter(s => !idsToRemove.includes(s.id)));
        }, 1000);
      }
    };
    
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // Init blockchain when account connects
  useEffect(() => {
    if (account) {
      initializeProvider(account).catch(console.error);
    }
  }, [account, initializeProvider]);

  const handleConnect = (acc) => setAccount(acc);
  const handleDisconnect = () => {
    setAccount(null);
    setPage('home');
  };

  const goHome = () => setPage('home');

  return (
    <div className="app-wrapper" style={{ 
      '--mouse-x': `${mousePos.x}px`, 
      '--mouse-y': `${mousePos.y}px` 
    }}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-inner">
          {/* Brand */}
          <div className="header-brand" onClick={goHome} style={{ cursor: 'pointer' }}>
            <div className="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22 }}>
              <path d="M12 3L4 9V21H20V9L12 3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21V12H15V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="brand-name">BlockChain <span>Mortgage</span></div>
          </div>

          {/* Role Pill */}
          <div className="header-center">
            {page !== 'home' && (
              <div className={`role-pill ${page}`}>
                <span className="role-dot" />
                {page === 'borrower' ? 'Borrower Portal' : 'Lender Portal'}
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="header-right">
            {page !== 'home' && (
              <button className="back-btn" onClick={goHome}>
                ← Switch Role
              </button>
            )}
            <ConnectWallet onConnect={handleConnect} onDisconnect={handleDisconnect} currentAccount={account} />
          </div>
        </div>

        {/* Network error */}
        {blockchainError && (
          <div className="network-banner">
            Warning: {blockchainError}
          </div>
        )}
      </header>

      <main style={{ flex: 1 }}>
        {/* ── Home Page ──────────────────────────────────────────────── */}
        {page === 'home' && (
          <div className="home-page" style={{ padding: 'var(--sp-12) var(--sp-6)' }}>
            <div className="home-hero">
              <h1 className="home-title">
                Decentralized<br /><span>Mortgage Platform</span>
              </h1>
              <p className="home-subtitle">
                Transparent, trustless loan management on the blockchain.
                Connect your MetaMask wallet and choose your role to get started.
              </p>
            </div>

            <div className="role-cards">
              {/* Borrower Card */}
              <div
                className="role-card borrower-card"
                onClick={() => {
                  if (!account) {
                    alert('Please connect your MetaMask wallet first!');
                    return;
                  }
                  setPage('borrower');
                }}
              >
                <div className="role-icon">B</div>
                <div className="role-name">Borrower</div>
                <p className="role-desc">
                  Apply for a mortgage loan, track your EMI schedule, upload documents, and manage repayments.
                </p>
                <ul className="role-features">
                  {['Request a mortgage loan', 'Pay monthly EMIs', 'Upload documents to IPFS', 'Track loan status'].map(f => (
                    <li key={f}><span className="feature-dot" />{f}</li>
                  ))}
                </ul>
                <div className="role-cta">
                  Enter as Borrower <span>→</span>
                </div>
              </div>

              {/* Lender Card */}
              <div
                className="role-card lender-card"
                onClick={() => {
                  if (!account) {
                    alert('Please connect your MetaMask wallet first!');
                    return;
                  }
                  setPage('lender');
                }}
              >
                <div className="role-icon">L</div>
                <div className="role-name">Lender</div>
                <p className="role-desc">
                  Review loan applications, set terms, approve or reject requests, and monitor outstanding loans.
                </p>
                <ul className="role-features">
                  {['Review loan requests', 'Set interest & duration', 'Approve or reject loans', 'Monitor repayment progress'].map(f => (
                    <li key={f}><span className="feature-dot" />{f}</li>
                  ))}
                </ul>
                <div className="role-cta">
                  Enter as Lender <span>→</span>
                </div>
              </div>
            </div>

            {/* Banking Widgets */}
            <div className="market-widgets">
              {/* Market Overview */}
              <div className="widget-card">
                <div className="widget-header">
                  <div className="widget-icon">M</div>
                  <span>Market Overview</span>
                </div>
                <div className="widget-content">
                  <div className="market-row">
                    <span className="market-label">Prime Rate</span>
                    <span className="market-val">3.25%</span>
                  </div>
                  <div className="market-row">
                    <span className="market-label">ETH / USD</span>
                    <span className="market-val market-up">$2,481.40 (+1.2%)</span>
                  </div>
                  <div className="market-row">
                    <span className="market-label">GAS (Sepolia)</span>
                    <span className="market-val">Low (2 Gwei)</span>
                  </div>
                </div>
              </div>

              {/* Calculator Widget */}
              <div className="widget-card">
                <div className="widget-header">
                  <div className="widget-icon">C</div>
                  <span>Quick Calculator</span>
                </div>
                <div className="widget-content">
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Estimate your monthly repayment on 1 ETH.</p>
                  <div className="market-row">
                    <span className="market-label">12 Months (5%)</span>
                    <span className="market-val">0.087 ETH</span>
                  </div>
                  <div className="market-row">
                    <span className="market-label">24 Months (7%)</span>
                    <span className="market-val">0.044 ETH</span>
                  </div>
                </div>
              </div>

              {/* Security Widget */}
              <div className="widget-card">
                <div className="widget-header">
                  <div className="widget-icon">S</div>
                  <span>Secured Protocol</span>
                </div>
                <div className="widget-content">
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                    Your documents are encrypted and anchored on IPFS with sub-second finality on Sepolia.
                  </p>
                </div>
              </div>
            </div>

            <div className="home-features" style={{ marginTop: 'var(--sp-8)' }}>
              {[
                { label: 'Trustless & Secure' },
                { label: 'Instant Settlement' },
                { label: 'IPFS Documents' },
              ].map(f => (
                <div key={f.label} className="home-feature-item">
                  <span className="feat-label">{f.label}</span>
                </div>
              ))}
            </div>

            {!account && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'var(--sp-4)' }}>
                Connect your wallet first to access the dashboards
              </p>
            )}
          </div>
        )}

        {page === 'borrower' && (
          account
            ? contract
              ? <BorrowerDashboard contract={contract} account={account} />
              : <div className="load-state">
                  <div className="spinner" />
                  <p>Connecting to contract…</p>
                </div>
            : <div className="connect-prompt">
                <div className="connect-icon">&#128274;</div>
                <div className="connect-title">Wallet Not Connected</div>
                <p className="connect-desc">Connect your MetaMask wallet to access the Borrower dashboard.</p>
              </div>
        )}

        {page === 'lender' && (
          account
            ? contract
              ? <LenderDashboard contract={contract} account={account} />
              : <div className="load-state">
                  <div className="spinner" />
                  <p>Connecting to contract…</p>
                </div>
            : <div className="connect-prompt">
                <div className="connect-icon">&#128274;</div>
                <div className="connect-title">Wallet Not Connected</div>
                <p className="connect-desc">Connect your MetaMask wallet to access the Lender dashboard.</p>
              </div>
        )}
      </main>

      <footer className="app-footer">
        <span>© 2026 BlockMortgage</span>
        <span className="footer-dot" />
        <span>Sepolia Testnet</span>
        <span className="footer-dot" />
        <span>Decentralized &amp; Trustless</span>
      </footer>
      {/* Star Interaction Layer (Rendered last for Z-index) */}
      <div className="cursor-spotlight" />
      {sparks.map(spark => (
        <div 
          key={spark.id} 
          className={`sparkle star-4 ${spark.size}`} 
          style={{ 
            left: `${spark.x}px`, 
            top: `${spark.y}px`, 
            zIndex: 9999,
            '--tx': spark.tx,
            '--ty': spark.ty,
            '--spark-color': spark.color,
            '--spark-glow': spark.color,
            '--t-dur': '1s'
          }} 
        />
      ))}
    </div>
  );
}

export default App;
