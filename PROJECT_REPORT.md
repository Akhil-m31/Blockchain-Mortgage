# Decentralized Blockchain Mortgage System – Project Report

## 1. Executive Summary
The Decentralized Mortgage System is a transparent, peer-to-peer (P2P) lending platform built on the Ethereum blockchain. It removes the need for centralized banks by allowing direct interaction between a **Borrower** and a **Lender** through an immutable Smart Contract. 

Through this platform, borrowers can propose loan terms (Amount, Interest Rate, Duration) and securely upload their physical property documents to a decentralized storage network (IPFS). Lenders can dynamically monitor the blockchain for these applications, review the requested terms, approve loans, and track Equated Monthly Installment (EMI) repayments in real-time. 

## 2. Tools & Technologies Used
This project is built using a modern Web3 technology stack:

### Blockchain Layer
*   **Ethereum (Sepolia Testnet):** The public network where the smart contract is deployed and executed.
*   **Solidity:** The programming language used to write the `Mortgage.sol` smart contract logic.
*   **MetaMask:** The Web3 wallet extension used by users to sign transactions and manage their Ethereum accounts.

### Frontend Layer
*   **React.js (via Vite):** The core JavaScript framework used to build the fast, component-based user interface.
*   **Ethers.js (v6):** The crucial library that acts as the bridge allowing the React frontend to communicate with the Ethereum blockchain and the Smart Contract.
*   **CSS / UI Design:** A custom, premium dark-mode aesthetic utilizing CSS variables, glassmorphism, and responsive grid layouts.

### Infrastructure & APIs
*   **Pinata (IPFS):** InterPlanetary File System API used to permanently host the borrower's uploaded property documents in a decentralized manner without relying on centralized servers like AWS.
*   **Etherscan API (V2):** Used by the auto-scanner in the Lender Dashboard to crawl the blockchain and instantly pull back a list of all wallet addresses that have submitted a loan application.

---

## 3. Architecture & Working Mechanism
The architecture follows a standard Web3 dApp (Decentralized Application) model:

1.  **State Management on Blockchain:** There is no traditional backend server (like Node/Express) and no traditional database (like MySQL/MongoDB). The entire state of every loan is stored in the `mapping(address => Loan)` inside the Ethereum Smart Contract. 
2.  **No Sign-Ups:** Users do not create accounts with emails and passwords. Their **Wallet Address** acts as their unique identity. 
3.  **Role Separation:** The application routes users into two completely separate UI portals—one specifically designed for Borrowers, and one for Lenders—preventing UI clutter and ensuring strict access control.
4.  **Immutability:** Once a borrower submits an application, the terms are locked into the blockchain. The lender cannot maliciously alter the interest rate, and the borrower cannot deny the EMI schedule. 

---

## 4. Complete Application Flow

### Phase 1: Application (Borrower)
1.  A user connects their MetaMask wallet to the application and selects **Enter as Borrower**.
2.  In the `Apply for Loan` module, they propose the mortgage terms by entering the requested **Amount (ETH)**, an **Interest Rate (%)**, and a **Duration (Months)**.
3.  The borrower signs this transaction via MetaMask, and the `applyLoan()` function runs on the smart contract, permanently saving the request. 

### Phase 2: Document Verification (Borrower)
1.  The borrower navigates to the `Upload Document` module and uploads their mortgage deed (PDF/Image).
2.  The file is securely pinned to **IPFS** via Pinata, which generates a unique cryptographic hash (`CID`).
3.  The borrower triggers the `setDocumentHash()` function on the smart contract, permanently binding that IPFS hash to their loan record.

### Phase 3: Review & Approval (Lender)
1.  An investor connects a different MetaMask wallet and selects **Enter as Lender**.
2.  The Lender Dashboard automatically scans the blockchain and discovers the pending application in the `Loan Applications` tab. 
3.  The lender reviews the requested loan Amount, Interest, and clicks the IPFS link to verify the collateral documents. 
4.  If the terms are acceptable, the lender clicks **Approve**, calling the `approveLoan()` smart contract function. The loan state officially switches to *Active*.

### Phase 4: Repayment (Borrower)
1.  With the loan approved, the `calculateEMI()` contract function dynamically dictates the exact fraction of ETH due every month. 
2.  The borrower clicks **Pay EMI** in their dashboard. The `payEMI()` function increments their paid installments. The UI features a dynamic progress bar tracking their journey to 100% repayment. 

### Phase 5: Closure
1.  The Smart Contract algorithm strictly prevents early closure. 
2.  Only once the `emiPaid` exactly matches the `totalEmi`, the borrower's **Close Loan** button unlocks.
3.  The borrower triggers `closeLoan()`, marking the mortgage as legally and permanently fulfilled on the Ethereum blockchain.

---

## 5. Security & Transparency Advantages
*   **Trustless Execution:** Because the code is public and executes exactly as written on Ethereum, neither the borrower nor the lender needs to inherently trust each other. They trust the math.
*   **Protection against P2P Fraud:** The lender cannot change the interest rate halfway through the mortgage, and the borrower cannot erase their debt record, since the ledger is immutable. 
*   **Open Market Driven:** Since the borrower proposes the interest rate rather than a central bank dictating it, it creates a highly competitive, free-market lending environment.
