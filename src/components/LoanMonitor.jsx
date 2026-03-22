import { useState } from 'react';
import { ethers } from 'ethers';
import { parseLoan } from '../config';

/**
 * LoanMonitor — Lender tool to inspect any borrower's full loan details.
 * Read-only view showing all fields including EMI breakdown.
 */
export default function LoanMonitor({ contract }) {
  const [address,  setAddress]  = useState('');
  const [loan,     setLoan]     = useState(null);
  const [emiAmt,   setEmiAmt]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState(null);

  const handleLookup = async () => {
    setMessage(null);
    setLoan(null);
    setEmiAmt(null);

    const addrToCheck = address.trim();

    if (!addrToCheck || !ethers.isAddress(addrToCheck)) {
      setMessage({ type: 'error', text: 'Enter a valid Ethereum address (0x…). Check for spaces.' });
      return;
    }
    if (!contract) {
      setMessage({ type: 'error', text: 'Contract not initialized.' });
      return;
    }

    try {
      setLoading(true);
      const raw    = await contract.getLoan(address);
      const parsed = parseLoan(raw);

      if (!parsed) {
        setMessage({ type: 'info', text: 'No loan found for this address.' });
        return;
      }

      setLoan(parsed);

      // Try to get EMI amount from contract
      if (parsed.approved && !parsed.closed) {
        try {
          const emi = await contract.calculateEMI(address);
          setEmiAmt(Number(emi) / 1e18);
        } catch { /* might fail */ }
      }
      if (!parsed.approved) {
        const total = parsed.amountEth * (1 + parsed.interest / 100);
        setEmiAmt(total / parsed.duration);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

      {/* Address input */}
      <div className="form-group">
        <label className="form-label">Borrower Wallet Address</label>
        <div className="address-row">
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="0x..."
              value={address}
              onChange={e => setAddress(e.target.value)}
              disabled={loading}
            />
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleLookup}
            disabled={loading || !address}
          >
            {loading
              ? <><span className="btn-spinner" style={{ borderTopColor: 'var(--text-muted)' }} /> Loading…</>
              : '🔍 Lookup'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span className="alert-icon">{message.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {loan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', animation: 'fadeSlideUp 0.3s ease' }}>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <span className={`badge badge-${loan.closed ? 'closed' : loan.approved ? 'approved' : 'pending'}`}>
              <span className="status-dot" />
              {loan.closed ? 'Closed' : loan.approved ? 'Approved & Active' : 'Pending Approval'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {address.slice(0, 12)}…{address.slice(-8)}
            </span>
          </div>

          {/* Primary stats */}
          <div className="loan-stats-grid">
            <div className="loan-stat">
              <div className="loan-stat-label">Principal</div>
              <div className="loan-stat-value">{loan.amountEth.toFixed(4)}</div>
              <div className="loan-stat-sub">ETH</div>
            </div>
            <div className="loan-stat">
              <div className="loan-stat-label">Interest</div>
              <div className="loan-stat-value">{loan.interest}%</div>
              <div className="loan-stat-sub">per term</div>
            </div>
            <div className="loan-stat">
              <div className="loan-stat-label">Duration</div>
              <div className="loan-stat-value">{loan.duration}</div>
              <div className="loan-stat-sub">months</div>
            </div>
            <div className="loan-stat">
              <div className="loan-stat-label">EMI / Month</div>
              <div className="loan-stat-value" style={{ fontSize: '1.1rem' }}>
                {emiAmt !== null ? emiAmt.toFixed(5) : '—'}
              </div>
              <div className="loan-stat-sub">ETH</div>
            </div>
          </div>

          {/* Total repayment */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--r-lg)',
              padding: 'var(--sp-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                Total Repayment
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--blue-400)' }}>
                {(loan.amountEth * (1 + loan.interest / 100)).toFixed(6)} ETH
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                Interest Earned
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--emerald-400)' }}>
                {(loan.amountEth * (loan.interest / 100)).toFixed(6)} ETH
              </div>
            </div>
          </div>

          {/* EMI progress */}
          {loan.totalEmi > 0 && (
            <div className="emi-progress-block">
              <div className="emi-progress-header">
                <span className="emi-progress-label">💳 EMI Repayment Progress</span>
                <span className="emi-progress-count">{loan.emiPaid} / {loan.totalEmi}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${loan.emiPct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--sp-1)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{loan.emiPct}% complete</span>
                <span>{loan.totalEmi - loan.emiPaid} remaining</span>
              </div>
            </div>
          )}

          {/* Amount recovered */}
          {loan.approved && emiAmt !== null && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--sp-3)',
              }}
            >
              <div className="loan-stat">
                <div className="loan-stat-label">Amount Recovered</div>
                <div className="loan-stat-value" style={{ color: 'var(--emerald-400)', fontSize: '1rem' }}>
                  {(loan.emiPaid * emiAmt).toFixed(6)}
                </div>
                <div className="loan-stat-sub">ETH paid</div>
              </div>
              <div className="loan-stat">
                <div className="loan-stat-label">Amount Outstanding</div>
                <div className="loan-stat-value" style={{ color: 'var(--amber-400)', fontSize: '1rem' }}>
                  {((loan.totalEmi - loan.emiPaid) * emiAmt).toFixed(6)}
                </div>
                <div className="loan-stat-sub">ETH remaining</div>
              </div>
            </div>
          )}

          {/* Document hash */}
          {loan.documentHash && (
            <div className="doc-hash-block">
              <div className="doc-hash-label">📄 IPFS Document</div>
              <a
                className="doc-hash-value"
                href={`https://gateway.pinata.cloud/ipfs/${loan.documentHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--blue-400)', textDecoration: 'none', display: 'block' }}
              >
                {loan.documentHash}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
