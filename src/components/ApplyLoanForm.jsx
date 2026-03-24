import { useState } from 'react';
import { ethers } from 'ethers';

/**
 * Borrower submits a loan application.
 *  - amount    → in ETH (converted to Wei)
 *  - interest  → plain integer % (e.g. 10 = 10%). Stored as uint256 directly.
 *  - duration  → months (integer)
 *
 * The lender will review these terms and either approve or ask the borrower
 * to re-apply. The lender does NOT modify terms after submission.
 */
export default function ApplyLoanForm({ contract, onSuccess }) {
  const [amount,   setAmount]   = useState('');
  const [interest, setInterest] = useState('');
  const [duration, setDuration] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState(null);
  const [txHash,   setTxHash]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setTxHash(null);

    if (!amount || !interest || !duration) {
      setMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: 'Amount must be greater than 0.' });
      return;
    }
    if (parseInt(interest) < 1 || parseInt(interest) > 100) {
      setMessage({ type: 'error', text: 'Interest rate must be between 1 and 100.' });
      return;
    }
    if (parseInt(duration) < 1) {
      setMessage({ type: 'error', text: 'Duration must be at least 1 month.' });
      return;
    }
    if (!contract) {
      setMessage({ type: 'error', text: 'Contract not initialized.' });
      return;
    }

    try {
      setLoading(true);

      // amount: ETH → Wei
      const loanAmountWei = ethers.parseEther(amount);
      // interest: plain integer (e.g. 10 → stored as uint256(10))
      const interestRate  = BigInt(Math.round(parseFloat(interest)));
      // duration: months as uint256
      const loanDuration  = BigInt(parseInt(duration));

      const tx = await contract.applyLoan(loanAmountWei, interestRate, loanDuration);
      setMessage({ type: 'pending', text: 'Submitting application…' });
      setTxHash(tx.hash);

      await tx.wait();
      setMessage({ type: 'success', text: 'Loan application submitted successfully. Awaiting lender approval.' });
      setAmount(''); setInterest(''); setDuration('');
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err.code === 'ACTION_REJECTED') {
        setMessage({ type: 'error', text: 'Transaction rejected by user.' });
      } else {
        setMessage({ type: 'error', text: err.reason || err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Summary preview ── */
  const showPreview = amount && interest && duration
    && parseFloat(amount) > 0 && parseInt(interest) > 0 && parseInt(duration) > 0;

  let previewEMI = null;
  if (showPreview) {
    const totalAmount = parseFloat(amount) * (1 + parseFloat(interest) / 100);
    previewEMI = (totalAmount / parseInt(duration)).toFixed(6);
  }

  return (
    <form onSubmit={handleSubmit} className="form-stack">

      <div
        style={{
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--sp-4)',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: 'var(--text-secondary)' }}>How it works:</strong> Submit your requested loan amount along with your proposed interest rate and duration. The lender will review and approve the terms. You can only have one active loan at a time.
      </div>

      {/* Amount */}
      <div className="form-group">
        <label className="form-label">Loan Amount</label>
        <div className="input-prefix-wrapper">
          <span className="input-prefix">ETH</span>
          <input
            type="number"
            step="0.001"
            min="0.001"
            className="form-input"
            placeholder="e.g. 0.5"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={loading}
          />
        </div>
        <span className="form-hint">Enter loan amount in ETH</span>
      </div>

      {/* Interest */}
      <div className="form-group">
        <label className="form-label">Proposed Interest Rate</label>
        <div className="input-prefix-wrapper">
          <span className="input-prefix">%</span>
          <input
            type="number"
            step="1"
            min="1"
            max="100"
            className="form-input"
            placeholder="e.g. 10"
            value={interest}
            onChange={e => setInterest(e.target.value)}
            disabled={loading}
          />
        </div>
        <span className="form-hint">Annual interest rate (whole number, e.g. 10 for 10%)</span>
      </div>

      {/* Duration */}
      <div className="form-group">
        <label className="form-label">Repayment Duration</label>
        <div className="input-prefix-wrapper">
          <span className="input-prefix">Mo</span>
          <input
            type="number"
            step="1"
            min="1"
            className="form-input"
            placeholder="e.g. 12"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            disabled={loading}
          />
        </div>
        <span className="form-hint">Number of monthly installments</span>
      </div>

      {/* Preview */}
      {showPreview && (
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
          {[
            { label: 'Principal',    value: `${amount} ETH` },
            { label: 'Total Repay',  value: `${(parseFloat(amount) * (1 + parseFloat(interest)/100)).toFixed(6)} ETH` },
            { label: 'EMI / Month',  value: `${previewEMI} ETH` },
            { label: 'Duration',     value: `${duration} months` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary btn-full">
        {loading
          ? <><span className="btn-spinner" /> Submitting…</>
          : 'Submit Loan Application'}
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
            {message.type === 'success' ? '✓' : message.type === 'error' ? '×' : message.type === 'pending' ? '...' : 'i'}
          </span>
          <span>{message.text}</span>
        </div>
      )}
    </form>
  );
}
