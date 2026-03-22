import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { parseLoan } from '../config';

/**
 * ApproveLoan
 *  1. Lender enters borrower address → "Check Loan" (or auto-loads from prefillAddress)
 *  2. Loan details shown (amount, interest, duration requested by borrower)
 *  3. Lender clicks "Approve" → approveLoan(borrower)
 *
 * prefillAddress: if provided (e.g. clicked from PendingApplications list),
 * the address is pre-filled and the loan is auto-checked immediately.
 */
export default function ApproveLoan({ contract, account, prefillAddress = '', onSuccess }) {
  const [address, setAddress] = useState(prefillAddress);
  const [loan,    setLoan]    = useState(null);
  const [emiAmt,  setEmiAmt]  = useState(null);
  const [checking, setChecking] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState(null);
  const [txHash,   setTxHash]   = useState(null);

  // Auto-check when prefillAddress is provided
  useEffect(() => {
    if (prefillAddress && contract) {
      setAddress(prefillAddress);
      // Slight delay to let state settle
      setTimeout(() => handleCheckRef.current?.(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillAddress, contract]);

  // Keep handleCheck in a ref so the useEffect can call it
  const handleCheckRef = { current: null };

  const handleCheck = async (overrideAddress) => {
    handleCheckRef.current = handleCheck;
    // If called by button click, overrideAddress is an Event object, not a string
    const addr = typeof overrideAddress === 'string' ? overrideAddress : address;
    const addrToCheck = addr.trim();

    setMessage(null);
    setLoan(null);
    setEmiAmt(null);

    if (!addrToCheck || !ethers.isAddress(addrToCheck)) {
      setMessage({ type: 'error', text: 'Enter a valid Ethereum address (0x…). Check for spaces.' });
      return;
    }
    if (!contract) {
      setMessage({ type: 'error', text: 'Contract not initialized.' });
      return;
    }

    try {
      setChecking(true);
      const raw    = await contract.getLoan(addrToCheck);
      const parsed = parseLoan(raw);

      if (!parsed) {
        setMessage({ type: 'error', text: 'No loan application found for this address.' });
        return;
      }

      setLoan(parsed);

      // fetch EMI preview
      if (parsed.approved) {
        try {
          const emi = await contract.calculateEMI(addrToCheck);
          setEmiAmt(Number(emi) / 1e18);
        } catch { /* might fail if closed */ }
      } else {
        // Calculate locally for preview even before approval
        const total = parsed.amountEth * (1 + parsed.interest / 100);
        setEmiAmt(total / parsed.duration);
      }

      if (parsed.closed) {
        setMessage({ type: 'info', text: 'This loan has already been closed.' });
      } else if (parsed.approved) {
        setMessage({ type: 'warning', text: '⚠️ This loan is already approved.' });
      } else {
        setMessage({ type: 'info', text: '✓ Loan found. Review terms and approve below.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error fetching loan: ' + err.message });
    } finally {
      setChecking(false);
    }
  };

  const handleApprove = async () => {
    if (!loan || loan.approved || loan.closed) return;
    if (!contract) return;

    setMessage(null);
    setTxHash(null);
    try {
      setLoading(true);
      const tx = await contract.approveLoan(address);
      setMessage({ type: 'pending', text: 'Approval transaction submitted…' });
      setTxHash(tx.hash);
      await tx.wait();
      setMessage({ type: 'success', text: '✅ Loan approved successfully! The borrower can now make EMI payments.' });
      setLoan(prev => ({ ...prev, approved: true }));
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err.code === 'ACTION_REJECTED') {
        setMessage({ type: 'error', text: 'Transaction rejected.' });
      } else {
        setMessage({ type: 'error', text: err.reason || err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

      {/* Address Input */}
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
              disabled={checking || loading}
            />
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleCheck}
            disabled={checking || loading || !address}
          >
            {checking
              ? <><span className="btn-spinner" style={{ borderTopColor: 'var(--text-muted)' }} /> Checking…</>
              : '🔍 Check'}
          </button>
        </div>
      </div>

      {/* Loan Details Preview */}
      {loan && (
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-xl)',
            overflow: 'hidden',
          }}
        >
          {/* Status header */}
          <div
            style={{
              padding: 'var(--sp-4) var(--sp-5)',
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--sp-2)',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {address.slice(0, 10)}…{address.slice(-8)}
            </div>
            <span className={`badge badge-${loan.closed ? 'closed' : loan.approved ? 'approved' : 'pending'}`}>
              <span className="status-dot" />
              {loan.closed ? 'Closed' : loan.approved ? 'Approved' : 'Pending Approval'}
            </span>
          </div>

          {/* Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1px',
              background: 'var(--border-subtle)',
            }}
          >
            {[
              { label: 'Loan Amount', value: `${loan.amountEth.toFixed(4)} ETH` },
              { label: 'Interest Rate', value: `${loan.interest}%` },
              { label: 'Duration', value: `${loan.duration} months` },
              { label: 'EMI / Month', value: emiAmt !== null ? `${emiAmt.toFixed(6)} ETH` : '—' },
              { label: 'Total Repayment', value: `${(loan.amountEth * (1 + loan.interest / 100)).toFixed(4)} ETH` },
              { label: 'EMI Progress', value: `${loan.emiPaid} / ${loan.totalEmi}` },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: 'var(--bg-elevated)',
                  padding: 'var(--sp-3) var(--sp-4)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>{label}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Document hash if available */}
          {loan.documentHash && (
            <div style={{ padding: 'var(--sp-3) var(--sp-5)', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                📄 Document Hash
              </div>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${loan.documentHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--blue-400)',
                  wordBreak: 'break-all',
                  textDecoration: 'none',
                }}
              >
                {loan.documentHash}
              </a>
            </div>
          )}

          {/* EMI Progress Bar */}
          {loan.approved && (
            <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Repayment Progress</span>
                <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>{loan.emiPct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${loan.emiPct}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve Button */}
      {loan && !loan.approved && !loan.closed && (
        <button
          className="btn btn-success btn-full"
          onClick={handleApprove}
          disabled={loading}
        >
          {loading
            ? <><span className="btn-spinner" /> Approving…</>
            : '✅ Approve Loan'}
        </button>
      )}

      {/* Already approved info */}
      {loan && loan.approved && !loan.closed && (
        <div
          style={{
            padding: 'var(--sp-4)',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--r-lg)',
            fontSize: '0.85rem',
            color: 'var(--emerald-400)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
          }}
        >
          ✅ This loan is already approved. The borrower is making payments.
        </div>
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
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : message.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
