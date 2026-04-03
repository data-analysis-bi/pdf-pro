import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { compressPDF, downloadPDF } from '../utils/pdfUtils';
import { Download, ArrowLeft } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const CompressPDF = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCompress = async () => {
    if (!files.length) return toast.error('Please select a PDF file');
    setIsProcessing(true);
    try {
      const bytes = await compressPDF(files[0]);
      downloadPDF(bytes, 'compressed.pdf');
      toast.success('PDF compressed successfully!');
    } catch {
      toast.error('Failed to compress PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Compressing PDF..." />

      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>

      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(56,161,105,0.1)', color: '#38a169' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M5 9l7 7 7-7" /><path d="M5 15l7 7 7-7" />
          </svg>
        </div>
        <div>
          <h1 className="page-title">Compress PDF</h1>
          <p className="page-subtitle">Reduce file size while keeping quality</p>
        </div>
      </div>

      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Drop a PDF file here" />
      </div>

      <div className="action-row">
        <button className="btn-primary" onClick={handleCompress} disabled={!files.length || isProcessing}>
          <Download size={15} /> Compress & Download
        </button>
      </div>
    </div>
  );
};
