# BlockMortgage — Decentralized Lending Platform

A fully decentralized, transparent mortgage lending platform built on Ethereum. The platform enables trustless peer-to-peer lending where borrowers can request loans, upload verified documents to IPFS, and repay in fixed monthly installments (EMIs), while lenders can review, approve, and auto-monitor their loan portfolios directly from the blockchain.

## Features

- **Role-Based Portals:** Separate, dedicated dashboards for Borrowers and Lenders.
- **Smart Contract Driven:** All application logic, approval flows, EMIs, and repayments happen purely on-chain.
- **Auto-Scanning Applications:** Lender dashboard automatically scans the blockchain (via Etherscan API V2 or fallback RPC) to find and display newly submitted loan applications in real-time.
- **IPFS Document Storage:** Upload PDFs/images to Pinata IPFS and permanently bond the document hash to the blockchain loan record.
- **Live EMI Calculations:** Exact ETH repayment figures retrieved dynamically from the smart contract.
- **Premium Dark UI:** Fully responsive, modern React interface utilizing glassmorphism, CSS variables, and dynamic progress trackers.

---

## 🚀 Quick Start (Local Setup)

### 1. Requirements
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16+)
- [MetaMask](https://metamask.io/) Extension in your browser (connected to **Sepolia Testnet**).

### 2. Environment Variables
Create a `.env` file in the root of your project directory and add the following keys:

```env
# Smart Contract Info (Sepolia)
VITE_CONTRACT_ADDRESS=0xe609DC56bB4A8a5Ff4980819fD026466fAfb0F91

# IPFS Upload Credentials (Get free from pinata.cloud)
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_API_KEY=your_pinata_secret_key

# Auto-Scanner API (Get free from etherscan.io)
VITE_ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Installation & Running
Open your terminal in the project folder and run:

```bash
npm install
npm run dev
```

The application will launch on your localhost (usually `http://localhost:5173` or `5174`).

---

## 👩‍💻 How to Present / Demo the Flow

Since this is a two-sided marketplace, you should simulate the interaction by opening **two separate browser windows** simultaneously:

### Window #1 (The Borrower)
1. Open Google Chrome with your primary MetaMask account (e.g., Account 1).
2. Go to `http://localhost:5174/`.
3. Click "Connect MetaMask" and then **Enter as Borrower**.
4. **Apply for a Loan:** Enter the ETH amount, interest percentage, and duration (e.g., 0.5 ETH, 10%, 12 months), and submit.
5. Watch the Blockchain transaction approve.

### Window #2 (The Lender)
1. Open a *different* browser (like Firefox/Brave) OR a Chrome Incognito Window with a *different* MetaMask account (e.g., Account 2).
2. Go to `http://localhost:5174/`.
3. Click "Connect MetaMask" and then **Enter as Lender**.
4. **Loan Applications Tab:** Wait a moment, and click 🔄 Refresh. You will automatically see the Borrower's new application sitting in the *"⏳ Awaiting Approval"* list. 
5. Click **✅ Approve**. Review their requested terms, and confirm the approval transaction on MetaMask.

### Window #1 (The Borrower again)
1. After the Lender's transaction passes, click *Refresh* on the Borrower dashboard. 
2. Your loan is now **Approved & Active**! You will see the exact EMI amount to pay.
3. You can now simulate paying off the loan by repeatedly clicking **Pay EMI** until the progress tracker hits 100%.
4. Once fully paid, the **Close Loan** button will unlock. Click it to officially fulfill the mortgage.

---

## 🛠 Tech Stack

- **Frontend:** React + Vite
- **Blockchain Interface:** Ethers.js v6
- **Smart Contract:** Solidity (Deployed on Sepolia Testnet)
- **Decentralized Storage:** IPFS (via Pinata API)
- **Styling:** Custom CSS with robust global variables

## 📜 Smart Contract

The core contract functions (`Mortgage.sol`):
- `applyLoan(amount, interest, duration)` - Initiates a request.
- `approveLoan(borrowerAddress)` - Lender signs off on the request.
- `getLoan(address)` / `calculateEMI(address)` - View logic to pull exact state & amounts.
- `payEMI()` - Progressive installment payment tracker.
- `closeLoan()` - Finalizes the loan when all installments are cleared.
