import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config';

export function useBlockchain() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);

  const initializeProvider = useCallback(async (account) => {
    try {
      setError(null);
      if (!window.ethereum) throw new Error('MetaMask is not installed');

      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);

      const ethSigner = await ethProvider.getSigner(account);
      setSigner(ethSigner);

      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, ethSigner);
      setContract(contractInstance);

      return { provider: ethProvider, signer: ethSigner, contract: contractInstance };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return { provider, signer, contract, error, initializeProvider };
}
