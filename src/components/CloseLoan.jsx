import { useState, useEffect, useCallback } from 'react';
import { parseLoan } from '../config';

/**
 * CloseLoan — Borrower closes their own loan after all EMIs are paid.
 * The contract's closeLoan() uses msg.sender, so only the borrower can call it.
 * The button is only enabled when emiPaid === totalEmi and not already closed.
 */
export default function CloseLoan({ contract, account, onSuccess }) {
  const [loan,     setLoan]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [closing,  setClosing]  = useState(false);
  const [message,  setMessage]  = useState(null);
  const [txHash,   setTxHash]   = useState(null);
  const [confirm,  setConfirm]  = useState(false);

  const fetchLoan = useCallback(async () => {
    if (!contract || !account) return;
    setLoading(true);
    try {
      const raw    = await contract.getLoan(account);
      const parsed = parseLoan(raw);
      setLoan(parsed);
    } catch (err) {
      console.error('CloseLoan fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [contract, account]);

  useEffect(() => { fetchLoan(); }, [fetchLoan]);

  const handleClose = async () => {
    if (!contract) return;
    setMessage(null);
    setTxHash(null);
    try {
      setClosing(true);
      const tx = await contract.closeLoan();
      setMessage({ type: 'pending', text: 'Closing loan on blockchain…' });
      setTxHash(tx.hash);
      await tx.wait();
      setMessage({ type: 'success', text: 'Loan closed successfully. Your mortgage is complete.' });
      setConfirm(false);
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
      setClosing(false);
    }
  };

  if (loading) return (
    <div className="load-state">
      <div className="spinner spinner-sm" />
    </div>
  );

  if (!loan) return (
    <div className="empty-state">
      <span className="empty-icon" style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>&#128274;</span>
      <span className="empty-title">No Loan Found</span>
      <span className="empty-desc">Apply for a loan to use this section.</span>
    </div>
  );

  if (loan.closed) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="alert alert-success">
        <span className="alert-icon">✓</span>
        <span>This loan has already been closed. Your mortgage obligations are fulfilled.</span>
      </div>
    </div>
  );

  const allPaid = loan.emiPaid >= loan.totalEmi && loan.totalEmi > 0;
  const canClose = allPaid && loan.approved && !loan.closed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

      {/* Status summary */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--sp-4)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--sp-3)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>EMIs Paid</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: allPaid ? 'var(--emerald-400)' : 'var(--text-primary)' }}>
            {loan.emiPaid} / {loan.totalEmi}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Loan Status</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            <span className={`badge badge-${loan.closed ? 'closed' : loan.approved ? 'active' : 'pending'}`}>
              <span className="status-dot" />
              {loan.closed ? 'Closed' : loan.approved ? 'Active' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Condition messages */}
      {!loan.approved && (
        <div className="alert alert-warning">
          <span className="alert-icon">!</span>
          <span>Loan must be approved by the lender before it can be closed.</span>
        </div>
      )}

      {loan.approved && !allPaid && (
        <div className="alert alert-info">
          <span className="alert-icon">i</span>
          <span>
            You must pay all {loan.totalEmi} EMIs before closing the loan.
            {' '}{loan.totalEmi - loan.emiPaid} payment(s) remaining.
          </span>
        </div>
      )}

      {canClose && !confirm && (
        <>
          <div className="confirm-box">
            <div className="confirm-box-title">All EMIs Paid</div>
            <div className="confirm-box-desc">
              You have successfully paid all {loan.totalEmi} installments. 
              Click below to permanently close this loan on the blockchain. 
              This action is irreversible.
            </div>
          </div>
          <button
            className="btn btn-danger btn-full"
            onClick={() => setConfirm(true)}
          >
            Request Loan Closure
          </button>
        </>
      )}

      {canClose && confirm && (
        <>
          <div
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--r-lg)',
              padding: 'var(--sp-5)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--sp-2)', color: 'var(--red-600)' }}>!</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--red-400)', marginBottom: 'var(--sp-2)' }}>
              Confirm Loan Closure
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              This will permanently mark your loan as closed on the blockchain. This cannot be undone.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setConfirm(false)}
              disabled={closing}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={handleClose}
              disabled={closing}
            >
              {closing
                ? <><span className="btn-spinner" /> Closing…</>
                : 'Confirm Closure'}
            </button>
          </div>
        </>
      )}

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
