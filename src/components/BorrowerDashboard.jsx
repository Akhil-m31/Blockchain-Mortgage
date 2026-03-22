import { useState } from 'react';
import ApplyLoanForm from './ApplyLoanForm';
import LoanDetails from './LoanDetails';
import PayEMI from './PayEMI';
import IPFSUpload from './IPFSUpload';
import CloseLoan from './CloseLoan';

export default function BorrowerDashboard({ contract, account }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="dashboard">
      {/* Hero */}
      <div className="dashboard-hero">
        <div className="dashboard-title-block">
          <h1>🏠 Borrower Dashboard</h1>
          <p>Apply for a loan, track EMIs, and manage your mortgage documents.</p>
        </div>
        <div className="dashboard-account">
          <span className="acc-label">Wallet</span>
          <span className="acc-address">{account.slice(0, 8)}…{account.slice(-6)}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="dashboard-grid">

        {/* LEFT COLUMN */}
        <div className="dashboard-col">

          {/* Apply Loan */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon icon-blue">📝</div>
              <div className="card-header-text">
                <h3>Apply for Loan</h3>
                <p>Submit your mortgage request</p>
              </div>
            </div>
            <div className="card-body">
              <ApplyLoanForm contract={contract} onSuccess={triggerRefresh} />
            </div>
          </div>

          {/* Document Upload */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon icon-violet">📄</div>
              <div className="card-header-text">
                <h3>Upload Document</h3>
                <p>Store your mortgage docs on IPFS</p>
              </div>
            </div>
            <div className="card-body">
              <IPFSUpload contract={contract} account={account} onSuccess={triggerRefresh} />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="dashboard-col">

          {/* Loan Details */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon icon-green">📊</div>
              <div className="card-header-text">
                <h3>Loan Status</h3>
                <p>Your current loan details</p>
              </div>
            </div>
            <div className="card-body">
              <LoanDetails key={refreshKey} contract={contract} account={account} />
            </div>
          </div>

          {/* Pay EMI */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon icon-amber">💳</div>
              <div className="card-header-text">
                <h3>Pay EMI</h3>
                <p>Make your monthly payment</p>
              </div>
            </div>
            <div className="card-body">
              <PayEMI contract={contract} account={account} onSuccess={triggerRefresh} />
            </div>
          </div>

          {/* Close Loan */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon icon-red">🔐</div>
              <div className="card-header-text">
                <h3>Close Loan</h3>
                <p>Complete and close after full repayment</p>
              </div>
            </div>
            <div className="card-body">
              <CloseLoan contract={contract} account={account} onSuccess={triggerRefresh} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
