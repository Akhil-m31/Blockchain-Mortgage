import { useState, useEffect, useCallback } from 'react';
import { parseLoan } from '../config';

/**
 * PayEMI — shows current loan state and EMI amount before allowing payment.
 * Only enabled when:
 *  - Loan is approved
 *  - Loan is not closed
 *  - emiPaid < totalEmi
 */
export default function PayEMI({ contract, account, onSuccess }) {
  const [loan,    setLoan]    = useState(null);
  const [emiAmt,  setEmiAmt]  = useState(null);
  const [emiAmtWei, setEmiAmtWei] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paying,  setPaying]  = useState(false);
  const [message, setMessage] = useState(null);
  const [txHash,  setTxHash]  = useState(null);

  const fetchLoan = useCallback(async () => {
    if (!contract || !account) return;
    setLoading(true);
    try {
      const raw    = await contract.getLoan(account);
      const parsed = parseLoan(raw);
      setLoan(parsed);
      if (parsed && parsed.approved && !parsed.closed) {
        try {
          const emi = await contract.calculateEMI(account);
          setEmiAmt(Number(emi) / 1e18);
          setEmiAmtWei(emi);
        } catch { setEmiAmt(null); setEmiAmtWei(null); }
      }
    } catch (err) {
      console.error('Failed to load loan for PayEMI:', err);
    } finally {
      setLoading(false);
    }
  }, [contract, account]);

  useEffect(() => { fetchLoan(); }, [fetchLoan]);

  const handlePay = async () => {
    if (!contract) return;
    setMessage(null);
    setTxHash(null);
    try {
      setPaying(true);
      const tx = await contract.payEMI({ value: emiAmtWei });
      setMessage({ type: 'pending', text: 'Processing EMI payment…' });
      setTxHash(tx.hash);
      await tx.wait();
      setMessage({ type: 'success', text: 'EMI payment recorded on blockchain.' });
      if (onSuccess) onSuccess();
      fetchLoan();
    } catch (err) {
      if (err.code === 'ACTION_REJECTED') {
        setMessage({ type: 'error', text: 'Transaction rejected.' });
      } else {
        const reason = err.reason || err.data?.message || err.message;
        setMessage({ type: 'error', text: reason });
      }
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="load-state">
      <div className="spinner spinner-sm" />
    </div>
  );

  // No loan
  if (!loan) return (
    <div className="empty-state">
      <span className="empty-icon" style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>E</span>
      <span className="empty-title">No Active Loan</span>
      <span className="empty-desc">Apply for a loan first to enable EMI payments.</span>
    </div>
  );

  // Not approved yet
  if (!loan.approved) return (
    <div className="alert alert-warning">
      <span className="alert-icon">!</span>
      <span>Your loan is pending lender approval before you can make EMI payments.</span>
    </div>
  );

  // Already closed
  if (loan.closed) return (
    <div className="alert alert-success">
      <span className="alert-icon">✓</span>
      <span>This loan has been fully repaid and closed.</span>
    </div>
  );

  // All EMIs paid
  if (loan.emiPaid >= loan.totalEmi) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="alert alert-success">
        <span className="alert-icon">✓</span>
        <span>All {loan.totalEmi} EMIs paid! Please close the loan in the Loan Closure section.</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

      {/* EMI Info Box */}
      <div className="emi-amount-box">
        <div className="emi-amount-info">
          <span className="emi-amount-label">EMI Amount</span>
          <span className="emi-amount-value">
            {emiAmt !== null ? `${emiAmt.toFixed(6)} ETH` : '—'}
          </span>
          <span className="emi-amount-sub">
            Installment {loan.emiPaid + 1} of {loan.totalEmi}
          </span>
        </div>
        <span style={{ fontSize: '1.4rem', color: 'var(--navy-700)', fontWeight: 700 }}>ETH</span>
      </div>

      {/* Progress */}
      <div className="emi-progress-block">
        <div className="emi-progress-header">
          <span className="emi-progress-label">Progress</span>
          <span className="emi-progress-count">{loan.emiPaid}/{loan.totalEmi}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${loan.emiPct}%` }} />
        </div>
        <div className="progress-pct">{loan.emiPct}% complete</div>
      </div>

      {/* Breakdown reminder */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--r-md)',
          padding: 'var(--sp-3) var(--sp-4)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--sp-2)',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Remaining EMIs</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {loan.totalEmi - loan.emiPaid}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Remaining Total</div>
          <div style={{ color: 'var(--navy-700)', fontWeight: 700 }}>
            {emiAmt !== null
              ? `${((loan.totalEmi - loan.emiPaid) * emiAmt).toFixed(6)} ETH`
              : '—'}
          </div>
        </div>
      </div>

      <button
        className="btn btn-success btn-full"
        onClick={handlePay}
        disabled={paying}
      >
        {paying
          ? <><span className="btn-spinner" /> Processing…</>
          : `Pay EMI #${loan.emiPaid + 1}`}
      </button>

      {txHash && (
        <div className="tx-block">
          <span className="tx-label">Tx:</span>
          <a className="tx-link" href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            {txHash.slice(0, 14)}…{txHash.slice(-10)}
          </a>
        </div>
      )}

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span className="alert-icon">
            {message.type === 'success' ? '✓' : message.type === 'error' ? '×' : '...'}
          </span>
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
