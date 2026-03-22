import { useState } from 'react';
import ApproveLoan from './ApproveLoan';
import LoanMonitor from './LoanMonitor';
import PendingApplications from './PendingApplications';

export default function LenderDashboard({ contract, account }) {
  const [refreshKey,       setRefreshKey]       = useState(0);
  const [selectedBorrower, setSelectedBorrower] = useState('');
  const [activeTab,        setActiveTab]        = useState('applications'); // 'applications' | 'approve' | 'inspect'

  const triggerRefresh = () => setRefreshKey(k => k + 1);

  // When lender clicks Approve/Inspect from the applications list
  const handleSelectBorrower = (address) => {
    setSelectedBorrower(address);
    setActiveTab('approve');
  };

  const tabs = [
    { id: 'applications', label: '📋 Loan Applications', desc: 'Auto-scanned from blockchain' },
    { id: 'approve',      label: '✅ Approve',           desc: 'Review & approve a loan' },
    { id: 'inspect',      label: '🔍 Inspect',           desc: 'View any loan details' },
  ];

  return (
    <div className="dashboard">
      {/* Hero */}
      <div className="dashboard-hero">
        <div className="dashboard-title-block">
          <h1>💼 Lender Dashboard</h1>
          <p>Applications appear here automatically when borrowers submit. Review, approve and monitor loans.</p>
        </div>
        <div className="dashboard-account">
          <span className="acc-label">Wallet</span>
          <span className="acc-address">{account.slice(0, 8)}…{account.slice(-6)}</span>
        </div>
      </div>

      {/* Tab Nav */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--sp-2)',
          marginBottom: 'var(--sp-6)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--r-xl)',
          padding: 'var(--sp-2)',
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: 'var(--sp-3) var(--sp-4)',
              borderRadius: 'var(--r-lg)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.1))'
                : 'transparent',
              borderBottom: activeTab === tab.id
                ? '2px solid var(--violet-500)'
                : '2px solid transparent',
            }}
          >
            <span style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'color 200ms',
            }}>
              {tab.label}
            </span>
            <span style={{
              fontSize: '0.7rem',
              color: activeTab === tab.id ? 'var(--text-secondary)' : 'var(--text-muted)',
            }}>
              {tab.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'applications' && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon icon-amber">📋</div>
            <div className="card-header-text">
              <h3>Loan Applications</h3>
              <p>All borrower applications from the blockchain, updated in real time</p>
            </div>
          </div>
          <div className="card-body">
            <PendingApplications
              key={refreshKey}
              contract={contract}
              onSelectBorrower={handleSelectBorrower}
            />
          </div>
        </div>
      )}

      {activeTab === 'approve' && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon icon-green">✅</div>
            <div className="card-header-text">
              <h3>Approve Loan</h3>
              <p>Review terms and approve the borrower's application</p>
            </div>
          </div>
          <div className="card-body">
            {/* Back to applications prompt */}
            {selectedBorrower && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--sp-3)',
                  padding: 'var(--sp-3) var(--sp-4)',
                  background: 'rgba(124,58,237,0.06)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 'var(--r-lg)',
                  marginBottom: 'var(--sp-5)',
                  fontSize: '0.82rem',
                }}
              >
                <span>📋</span>
                <span style={{ color: 'var(--text-muted)' }}>Selected from applications:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--violet-400)', fontWeight: 700 }}>
                  {selectedBorrower.slice(0, 12)}…{selectedBorrower.slice(-8)}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => { setSelectedBorrower(''); }}
                >
                  ✕ Clear
                </button>
              </div>
            )}
            <ApproveLoan
              key={`${refreshKey}-${selectedBorrower}`}
              contract={contract}
              account={account}
              prefillAddress={selectedBorrower}
              onSuccess={() => { triggerRefresh(); setActiveTab('applications'); }}
            />
          </div>
        </div>
      )}

      {activeTab === 'inspect' && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon icon-blue">🔍</div>
            <div className="card-header-text">
              <h3>Inspect Any Loan</h3>
              <p>Read-only view of any borrower's full loan details</p>
            </div>
          </div>
          <div className="card-body">
            <LoanMonitor key={refreshKey} contract={contract} />
          </div>
        </div>
      )}
    </div>
  );
}
