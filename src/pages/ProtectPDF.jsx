import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { protectPDF, downloadPDF } from '../utils/pdfUtils';
import { Download, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const ProtectPDF = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const handle = async () => {
    if (!files.length) return toast.error('Please select a PDF file');
    if (!password) return toast.error('Enter a password');
    if (password !== confirm) return toast.error('Passwords do not match');
    setIsProcessing(true);
    try {
      const bytes = await protectPDF(files[0], password);
      downloadPDF(bytes, 'protected.pdf');
      toast.success('PDF protected with password!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to protect PDF');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Encrypting PDF..." />
      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(113,128,150,0.1)', color: '#718096' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">Protect PDF</h1>
          <p className="page-subtitle">Add password protection to your PDF</p>
        </div>
      </div>
      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Drop a PDF file here" />
      </div>
      {files.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" style={{ paddingRight: 44 }} />
                <button onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', display: 'flex', alignItems: 'center' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input className="input" type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" />
            </div>
            {password && confirm && password !== confirm && (
              <p style={{ fontSize: 13, color: '#e53e3e' }}>Passwords do not match</p>
            )}
          </div>
        </div>
      )}
      <div className="action-row">
        <button className="btn-primary" onClick={handle} disabled={!files.length || !password || password !== confirm || isProcessing}>
          <Download size={15} /> Protect & Download
        </button>
      </div>
    </div>
  );
};
