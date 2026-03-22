import { useState, useRef } from 'react';

/**
 * IPFSUpload
 *  Step 1: Upload file to Pinata → get IPFS hash
 *  Step 2: Store that hash on-chain via setDocumentHash()
 *
 * Requires .env:
 *   VITE_PINATA_API_KEY
 *   VITE_PINATA_SECRET_API_KEY
 */
export default function IPFSUpload({ contract, account, onSuccess }) {
  const [file,        setFile]        = useState(null);
  const [ipfsHash,    setIpfsHash]    = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [storing,     setStoring]     = useState(false);
  const [message,     setMessage]     = useState(null);
  const [txHash,      setTxHash]      = useState(null);
  const [dragOver,    setDragOver]    = useState(false);
  const fileInputRef = useRef(null);

  const PINATA_KEY    = import.meta.env.VITE_PINATA_API_KEY || '';
  const PINATA_SECRET = import.meta.env.VITE_PINATA_SECRET_API_KEY || '';

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIpfsHash(null);
    setMessage(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  // Step 1: Upload to IPFS
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first.' });
      return;
    }
    if (!PINATA_KEY || !PINATA_SECRET) {
      setMessage({
        type: 'warning',
        text: 'Pinata API credentials not configured (VITE_PINATA_API_KEY / VITE_PINATA_SECRET_API_KEY). Add them to your .env file.',
      });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: PINATA_KEY,
          pinata_secret_api_key: PINATA_SECRET,
        },
        body: formData,
      });

      if (!res.ok) throw new Error(`Pinata: ${res.statusText}`);
      const data = await res.json();
      setIpfsHash(data.IpfsHash);
      setMessage({ type: 'success', text: `✅ Uploaded to IPFS: ${data.IpfsHash.slice(0, 20)}…` });
      setFile(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Upload failed: ' + err.message });
    } finally {
      setUploading(false);
    }
  };

  // Step 2: Store hash on chain
  const handleStore = async () => {
    if (!ipfsHash || !contract) return;
    setTxHash(null);
    setMessage(null);
    try {
      setStoring(true);
      const tx = await contract.setDocumentHash(ipfsHash);
      setMessage({ type: 'pending', text: 'Storing hash on blockchain…' });
      setTxHash(tx.hash);
      await tx.wait();
      setMessage({ type: 'success', text: '✅ Document hash stored on blockchain!' });
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err.code === 'ACTION_REJECTED') {
        setMessage({ type: 'error', text: 'Transaction rejected.' });
      } else {
        setMessage({ type: 'error', text: 'Store failed: ' + err.message });
      }
    } finally {
      setStoring(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

      {/* Step 1 */}
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          STEP 1 — UPLOAD TO IPFS
        </div>

        {/* Drop Zone */}
        <div
          className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <span className="file-drop-icon">📁</span>
          <div className="file-drop-text">Drop your file here or click to browse</div>
          <div className="file-drop-hint">PDF, JPG, PNG, DOC — max 10MB</div>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={e => handleFileSelect(e.target.files[0])}
            disabled={uploading}
          />
        </div>

        {file && (
          <div className="file-selected">
            <span>📎</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </span>
            <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={uploading || !file}
        >
          {uploading
            ? <><span className="btn-spinner" /> Uploading to IPFS…</>
            : '☁️ Upload to IPFS'}
        </button>
      </form>

      {/* Step 2 */}
      {ipfsHash && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            STEP 2 — STORE HASH ON BLOCKCHAIN
          </div>

          <div className="doc-hash-block">
            <div className="doc-hash-label">IPFS Hash</div>
            <a
              href={`https://gateway.pinata.cloud/ipfs/${ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="doc-hash-value"
              style={{ color: 'var(--blue-400)', textDecoration: 'none', display: 'block' }}
            >
              {ipfsHash}
            </a>
          </div>

          <button
            className="btn btn-violet btn-full"
            onClick={handleStore}
            disabled={storing}
          >
            {storing
              ? <><span className="btn-spinner" /> Storing…</>
              : '⛓️ Store Hash on Blockchain'}
          </button>
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
            {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : message.type === 'warning' ? '⚠️' : '⏳'}
          </span>
          <span style={{ fontSize: '0.85rem' }}>{message.text}</span>
        </div>
      )}
    </div>
  );
}
