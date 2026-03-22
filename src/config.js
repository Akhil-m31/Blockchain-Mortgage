// Blockchain Configuration
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x...";
export const SEPOLIA_CHAIN_ID = 11155111;

// Smart Contract ABI — Blockchain Mortgage System
export const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "amount",   type: "uint256" },
      { internalType: "uint256", name: "interest",  type: "uint256" },
      { internalType: "uint256", name: "duration",  type: "uint256" }
    ],
    name: "applyLoan",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "borrower", type: "address" }],
    name: "approveLoan",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "closeLoan",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "payEMI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "hash", type: "string" }],
    name: "setDocumentHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "borrower", type: "address" }],
    name: "calculateEMI",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getLoan",
    outputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "bool",    name: "", type: "bool"    },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "string",  name: "", type: "string"  },
      { internalType: "bool",    name: "", type: "bool"    }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "loans",
    outputs: [
      { internalType: "address", name: "borrower",     type: "address" },
      { internalType: "uint256", name: "amount",       type: "uint256" },
      { internalType: "uint256", name: "interest",     type: "uint256" },
      { internalType: "uint256", name: "duration",     type: "uint256" },
      { internalType: "bool",    name: "approved",     type: "bool"    },
      { internalType: "uint256", name: "emiPaid",      type: "uint256" },
      { internalType: "uint256", name: "totalEmi",     type: "uint256" },
      { internalType: "string",  name: "documentHash", type: "string"  },
      { internalType: "bool",    name: "closed",       type: "bool"    }
    ],
    stateMutability: "view",
    type: "function"
  }
];

// ── Helpers ──────────────────────────────────────────────────────

export const checkNetwork = async () => {
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  return parseInt(chainId, 16) === SEPOLIA_CHAIN_ID;
};

export const switchToSepolia = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:           `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
          rpcUrls:           ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
          chainName:         'Sepolia Test Network',
          nativeCurrency:    { name: 'ETH', symbol: 'ETH', decimals: 18 },
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      });
    } else {
      throw error;
    }
  }
};

/**
 * Parse a raw loan tuple returned by getLoan() / loans().
 * interest is stored as a plain integer percentage (e.g. 5 → 5%).
 * amount is stored in Wei.
 */
export function parseLoan(raw) {
  if (!raw) return null;
  // Ethers v6 returns arrays for unnamed tuple outputs
  const amount = raw.amount !== undefined ? raw.amount : raw[1];
  if (!amount || amount === 0n || amount === 0) return null;

  const emiPaid  = Number(raw.emiPaid !== undefined ? raw.emiPaid : raw[5] || 0n);
  const totalEmi = Number(raw.totalEmi !== undefined ? raw.totalEmi : raw[6] || 0n);

  return {
    borrower:     raw.borrower ?? raw[0],
    amount:       amount,                               // BigInt (Wei)
    amountEth:    Number(amount) / 1e18,                // human ETH
    interest:     Number(raw.interest ?? raw[2]),       // plain % (e.g. 5)
    duration:     Number(raw.duration ?? raw[3]),       // months
    approved:     raw.approved ?? raw[4],
    emiPaid,
    totalEmi,
    emiPct:       totalEmi > 0 ? ((emiPaid / totalEmi) * 100).toFixed(1) : '0.0',
    documentHash: raw.documentHash ?? raw[7] ?? '',
    closed:       raw.closed ?? raw[8],
  };
}
