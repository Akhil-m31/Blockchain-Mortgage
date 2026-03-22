import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, parseLoan } from '../config';

/**
 * PendingApplications
 *
 * Scans the blockchain for all `applyLoan` transactions sent to the contract.
 * Extracts the unique sender addresses, fetches their loan data, and displays
 * all pending (not yet approved) applications so the lender can review them.
 *
 * This gives the "natural flow":
 *   Borrower submits → appears here automatically → Lender clicks Approve
 */
export default function PendingApplications({ contract, onSelectBorrower }) {
  const [applications, setApplications] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [lastScanned,  setLastScanned]  = useState(null);
  const [error,        setError]        = useState(null);

  // The 4-byte function selector for applyLoan(uint256,uint256,uint256)
  // keccak256("applyLoan(uint256,uint256,uint256)").slice(0,10) = 0x120fb04d
  const APPLY_LOAN_SELECTOR = '0x120fb04d';

  const scan = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    setError(null);

    try {
      const provider  = contract.runner?.provider || contract.provider;
      const latest    = await provider.getBlockNumber();

      // Scan last 50,000 blocks (adjust based on testnet activity)
      const fromBlock = Math.max(0, latest - 50000);

      // Get all transactions TO the contract
      // We use getLogs with no topic filter (catch all), then filter by input data
      // Since there are no events, we scan tx receipts via block range
      // More efficient: use provider.send to get tx list if available
      // Fallback: use a known-working pattern for Sepolia

      // Fetch all transactions sent to our contract by iterating blocks
      // This is expensive for large ranges, so we limit and cache
      // Better approach: use the Etherscan API if available, else scan recent blocks
      const ETHERSCAN_API = import.meta.env.VITE_ETHERSCAN_API_KEY || '';

      let borrowerAddresses = new Set();
      let usedApi = false;
      const apiKey = ETHERSCAN_API.replace(/['"]/g, '').trim();

      if (apiKey) {
        try {
          // Fast path: Etherscan API V2
          const url = `https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist&address=${CONTRACT_ADDRESS}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
          const res   = await fetch(url);
          const data  = await res.json();
          if (data.status === '1' && Array.isArray(data.result)) {
             data.result.forEach(tx => {
              const txTo = (tx.to || '').toLowerCase();
              const txInput = (tx.input || '').toLowerCase();
              if (
                txTo === CONTRACT_ADDRESS.toLowerCase() &&
                txInput.startsWith(APPLY_LOAN_SELECTOR)
              ) {
                borrowerAddresses.add(tx.from.toLowerCase());
              }
            });
            usedApi = true;
          } else {
             console.warn(`Etherscan API: ${data.result || data.message || 'Unknown error'}`);
          }
        } catch (apiErr) {
          console.warn('Etherscan API fetch failed:', apiErr);
        }
      } 
      
      if (!usedApi) {
        // Fallback: scan recent blocks directly (slower but works without API key or when key fails)
        // Scan last 50 blocks to keep it lightning-fast for presentations (~10 mins of history)
        const scanFrom = Math.max(0, latest - 100);
        for (let b = scanFrom; b <= latest; b += 50) {
          const blockPromises = [];
          for (let i = b; i < Math.min(b + 50, latest + 1); i++) {
            blockPromises.push(provider.getBlock(i, true));
          }
          const blocks = await Promise.all(blockPromises);
          for (const block of blocks) {
            if (!block?.prefetchedTransactions) continue;
            for (const tx of block.prefetchedTransactions) {
              if (
                tx.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() &&
                tx.data?.startsWith(APPLY_LOAN_SELECTOR)
              ) {
                borrowerAddresses.add(tx.from.toLowerCase());
              }
            }
          }
        }
      }

      // Fetch loan details for each discovered address
      const apps = [];
      for (const addr of borrowerAddresses) {
        try {
          const raw    = await contract.getLoan(addr);
          const parsed = parseLoan(raw);
          if (parsed) {
            apps.push({ address: addr, loan: parsed });
          }
        } catch { /* skip if no loan */ }
      }

      setApplications(apps);
      setLastScanned(new Date());
    } catch (err) {
      setError('Scan error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [contract, APPLY_LOAN_SELECTOR]);

  useEffect(() => { scan(); }, [scan]);

  const pending  = applications.filter(a => !a.loan.approved && !a.loan.closed);
  const approved = applications.filter(a => a.loan.approved && !a.loan.closed);
  const closed   = applications.filter(a => a.loan.closed);

  const LoanRow = ({ item, actionLabel, actionClass, onAction }) => (
    <div className="loan-list-item">
      <div className="loan-list-header">
        <span className="loan-list-address">
          {item.address.slice(0, 10)}…{item.address.slice(-8)}
        </span>
        <span className={`badge badge-${item.loan.closed ? 'closed' : item.loan.approved ? 'approved' : 'pending'}`}>
          <span className="status-dot" />
          {item.loan.closed ? 'Closed' : item.loan.approved ? 'Approved' : 'Pending'}
        </span>
      </div>

      <div className="loan-list-meta">
        <div className="loan-meta-item">
          <span className="loan-meta-label">Amount</span>
          <span className="loan-meta-value">{item.loan.amountEth.toFixed(4)} ETH</span>
        </div>
        <div className="loan-meta-item">
          <span className="loan-meta-label">Interest</span>
          <span className="loan-meta-value">{item.loan.interest}%</span>
        </div>
        <div className="loan-meta-item">
          <span className="loan-meta-label">Duration</span>
          <span className="loan-meta-value">{item.loan.duration} mo</span>
        </div>
      </div>

      {/* EMI progress for approved loans */}
      {item.loan.approved && (
        <div style={{ marginBottom: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>EMI Progress</span>
            <span>{item.loan.emiPaid}/{item.loan.totalEmi}</span>
          </div>
          <div className="progress-track" style={{ height: '5px' }}>
            <div className="progress-fill" style={{ width: `${item.loan.emiPct}%` }} />
          </div>
        </div>
      )}

      <div className="loan-list-actions">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            navigator.clipboard?.writeText(item.address);
          }}
          title="Copy address"
        >
          📋 Copy
        </button>
        {onAction && (
          <button
            className={`btn ${actionClass} btn-sm`}
            onClick={() => onAction(item.address)}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

      {/* Scan controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {loading ? 'Scanning blockchain…' : `${applications.length} application(s) found`}
          </div>
          {lastScanned && !loading && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Last scanned: {lastScanned.toLocaleTimeString()}
            </div>
          )}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={scan}
          disabled={loading}
        >
          {loading
            ? <><span className="btn-spinner" style={{ borderTopColor: 'var(--text-muted)' }} /> Scanning…</>
            : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          <span style={{ fontSize: '0.82rem' }}>{error}</span>
        </div>
      )}

      {loading && (
        <div className="load-state" style={{ padding: 'var(--sp-6)' }}>
          <div className="spinner" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Scanning blockchain for loan applications…
          </span>
        </div>
      )}

      {!loading && (
        <>
          {/* PENDING Section */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
              marginBottom: 'var(--sp-3)',
              fontSize: '0.78rem', fontWeight: 700, color: 'var(--amber-400)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <span>⏳ Awaiting Approval</span>
              <span style={{
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--r-full)', padding: '1px 8px', fontSize: '0.7rem',
              }}>{pending.length}</span>
            </div>

            {pending.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--sp-6)' }}>
                <span className="empty-icon">📭</span>
                <span className="empty-desc">No pending applications found. Scan again after a borrower submits.</span>
              </div>
            ) : (
              <div className="loan-list">
                {pending.map(item => (
                  <LoanRow
                    key={item.address}
                    item={item}
                    actionLabel="✅ Approve"
                    actionClass="btn-success"
                    onAction={onSelectBorrower}
                  />
                ))}
              </div>
            )}
          </div>

          {/* APPROVED Section */}
          {approved.length > 0 && (
            <>
              <div className="divider" />
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                  marginBottom: 'var(--sp-3)',
                  fontSize: '0.78rem', fontWeight: 700, color: 'var(--emerald-400)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  <span>✅ Active Loans</span>
                  <span style={{
                    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 'var(--r-full)', padding: '1px 8px', fontSize: '0.7rem',
                  }}>{approved.length}</span>
                </div>
                <div className="loan-list">
                  {approved.map(item => (
                    <LoanRow
                      key={item.address}
                      item={item}
                      actionLabel="🔍 Inspect"
                      actionClass="btn-ghost"
                      onAction={onSelectBorrower}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CLOSED Section */}
          {closed.length > 0 && (
            <>
              <div className="divider" />
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                  marginBottom: 'var(--sp-3)',
                  fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-400)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  <span>🔒 Closed Loans</span>
                  <span style={{
                    background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)',
                    borderRadius: 'var(--r-full)', padding: '1px 8px', fontSize: '0.7rem',
                  }}>{closed.length}</span>
                </div>
                <div className="loan-list">
                  {closed.map(item => (
                    <LoanRow key={item.address} item={item} />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
