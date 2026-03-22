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
  const { contract, error: blockchainError, initializeProvider } = useBlockchain();

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

  // ── Header ──────────────────────────────────────────────────────
  const Header = () => (
    <header className="app-header">
      <div className="header-inner">
        {/* Brand */}
        <div className="header-brand" onClick={goHome} style={{ cursor: 'pointer' }}>
          <div className="brand-logo">🏦</div>
          <div className="brand-name">Block<span>Mortgage</span></div>
        </div>

        {/* Role Pill */}
        <div className="header-center">
          {page !== 'home' && (
            <div className={`role-pill ${page}`}>
              <span className="role-dot" />
              {page === 'borrower' ? '👤 Borrower Portal' : '👔 Lender Portal'}
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
          <ConnectWallet onConnect={handleConnect} onDisconnect={handleDisconnect} />
        </div>
      </div>

      {/* Network error */}
      {blockchainError && (
        <div className="network-banner">
          ⚠️ {blockchainError}
        </div>
      )}
    </header>
  );

  // ── Home Page ────────────────────────────────────────────────────
  const HomePage = () => (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-badge">🔗 Sepolia Testnet</div>
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
          <div className="role-icon">🏠</div>
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
          <div className="role-icon">💼</div>
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

      <div className="home-features">
        {[
          { icon: '🔒', label: 'Trustless & Secure' },
          { icon: '⚡', label: 'Instant Settlement' },
          { icon: '📄', label: 'IPFS Documents' },
        ].map(f => (
          <div key={f.label} className="home-feature-item">
            <span className="feat-icon">{f.icon}</span>
            <span className="feat-label">{f.label}</span>
          </div>
        ))}
      </div>

      {!account && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-16px' }}>
          👆 Connect your wallet first to access the dashboards
        </p>
      )}
    </div>
  );

  // ── Loading state ────────────────────────────────────────────────
  const Loading = () => (
    <div className="load-state">
      <div className="spinner" />
      <p>Connecting to contract…</p>
    </div>
  );

  return (
    <div className="app-wrapper">
      <Header />
      <main style={{ flex: 1 }}>
        {page === 'home' && <HomePage />}
        {page === 'borrower' && (
          account
            ? contract
              ? <BorrowerDashboard contract={contract} account={account} />
              : <Loading />
            : <div className="connect-prompt">
                <div className="connect-icon">🔒</div>
                <div className="connect-title">Wallet Not Connected</div>
                <p className="connect-desc">Connect your MetaMask wallet to access the Borrower dashboard.</p>
              </div>
        )}
        {page === 'lender' && (
          account
            ? contract
              ? <LenderDashboard contract={contract} account={account} />
              : <Loading />
            : <div className="connect-prompt">
                <div className="connect-icon">🔒</div>
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
    </div>
  );
}

export default App;
