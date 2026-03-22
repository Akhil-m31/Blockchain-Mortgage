import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { parseLoan } from '../config';

/**
 * Full loan details for the borrower including EMI breakdown.
 * Interest is stored as a plain uint256 percentage (e.g. 10 = 10%).
 * Amount is in Wei.
 */
export default function LoanDetails({ contract, account }) {
  const [loan,    setLoan]    = useState(null);
  const [emiAmt,  setEmiAmt]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchDetails = useCallback(async () => {
    if (!contract || !account) return;
    setLoading(true);
    setError(null);
    try {
      const raw  = await contract.getLoan(account);
      const parsed = parseLoan(raw);

      if (!parsed) {
        setLoan(null);
        setError('No active loan found. Apply for a loan to get started.');
        return;
      }
      setLoan(parsed);

      // fetch EMI amount from contract if approved
      if (parsed.approved && !parsed.closed) {
        try {
          const emi = await contract.calculateEMI(account);
          // EMI is returned in Wei
          setEmiAmt(Number(emi) / 1e18);
        } catch {
          setEmiAmt(null);
        }
      }
    } catch (err) {
      setError('Failed to load loan details: ' + err.message);
      setLoan(null);
    } finally {
      setLoading(false);
    }
  }, [contract, account]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  if (loading) return (
    <div className="load-state">
      <div className="spinner spinner-sm" />
      <span style={{ fontSize: '0.85rem' }}>Loading loan data…</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <button className="btn btn-ghost btn-sm" onClick={fetchDetails} disabled={loading}>
        🔄 Refresh
      </button>

      {error && !loan && (
        <div className="alert alert-info">
          <span className="alert-icon">ℹ️</span>
          <span>{error}</span>
        </div>
      )}

      {loan && (
        <>
          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span className={`badge badge-${loan.closed ? 'closed' : loan.approved ? 'active' : 'pending'}`}>
              <span className="status-dot" />
              {loan.closed ? 'Closed' : loan.approved ? 'Active' : 'Pending Approval'}
            </span>
            {loan.closed && (
              <span style={{ fontSize: '0.82rem', color: 'var(--emerald-400)' }}>
                ✅ Fully repaid
              </span>
            )}
          </div>

          {/* Stats Grid */}
          <div className="loan-stats-grid">
            <div className="loan-stat">
              <div className="loan-stat-label">Principal</div>
              <div className="loan-stat-value">{loan.amountEth.toFixed(4)}</div>
              <div className="loan-stat-sub">ETH</div>
            </div>
            <div className="loan-stat">
              <div className="loan-stat-label">Interest Rate</div>
              <div className="loan-stat-value">{loan.interest}%</div>
              <div className="loan-stat-sub">per loan term</div>
            </div>
            <div className="loan-stat">
              <div className="loan-stat-label">Total Repayment</div>
              <div className="loan-stat-value">
                {(loan.amountEth * (1 + loan.interest / 100)).toFixed(4)}
              </div>
              <div className="loan-stat-sub">ETH</div>
            </div>
            <div className="loan-stat">
              <div className="loan-stat-label">Duration</div>
              <div className="loan-stat-value">{loan.duration}</div>
              <div className="loan-stat-sub">months</div>
            </div>
          </div>

          {/* EMI Progress */}
          <div className="emi-progress-block">
            <div className="emi-progress-header">
              <span className="emi-progress-label">💳 EMI Progress</span>
              <span className="emi-progress-count">{loan.emiPaid} / {loan.totalEmi} paid</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${loan.emiPct}%` }}
              />
            </div>
            <div className="progress-pct">{loan.emiPct}% complete</div>
          </div>

          {/* EMI Amount */}
          {loan.approved && emiAmt !== null && !loan.closed && (
            <div className="emi-amount-box">
              <div className="emi-amount-info">
                <span className="emi-amount-label">Next EMI Due</span>
                <span className="emi-amount-value">{emiAmt.toFixed(6)} ETH</span>
                <span className="emi-amount-sub">
                  {loan.totalEmi - loan.emiPaid} installment(s) remaining
                </span>
              </div>
              {loan.emiPaid === loan.totalEmi
                ? <span style={{ fontSize: '1.5rem' }}>🎉</span>
                : <span style={{ fontSize: '1.5rem' }}>💰</span>
              }
            </div>
          )}

          {/* Document Hash */}
          {loan.documentHash && (
            <div className="doc-hash-block">
              <div className="doc-hash-label">📄 IPFS Document Hash</div>
              <div className="doc-hash-value">
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${loan.documentHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--emerald-400)', textDecoration: 'none' }}
                >
                  {loan.documentHash}
                </a>
              </div>
            </div>
          )}

          {/* Closed message */}
          {loan.closed && (
            <div className="alert alert-success">
              <span className="alert-icon">🎉</span>
              <span>Loan fully repaid and closed. Thank you!</span>
            </div>
          )}

          {/* All EMIs paid but not closed */}
          {!loan.closed && loan.emiPaid === loan.totalEmi && loan.approved && (
            <div className="alert alert-info">
              <span className="alert-icon">ℹ️</span>
              <span>All EMIs paid! You can now close the loan in the "Close Loan" section below.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
