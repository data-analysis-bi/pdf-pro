import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { mergePDFs, downloadPDF } from '../utils/pdfUtils';
import { Download, ArrowLeft } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const MergePDF = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMerge = async () => {
    if (files.length < 2) return toast.error('Select at least 2 PDF files');
    setIsProcessing(true);
    try {
      const bytes = await mergePDFs(files);
      downloadPDF(bytes, 'merged.pdf');
      toast.success('PDFs merged successfully!');
      setFiles([]);
    } catch {
      toast.error('Failed to merge PDFs');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Merging PDFs..." />

      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>

      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(229,62,62,0.1)', color: '#e53e3e' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/>
            <path d="M7 16l5 5 5-5M12 12v9"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">Merge PDF</h1>
          <p className="page-subtitle">Combine multiple PDF files into one document</p>
        </div>
      </div>

      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple title="Drop PDF files here" subtitle="or click to browse — add as many as you need" />
      </div>

      {files.length >= 2 && (
        <div className="info-box">
          {files.length} files selected — they will be merged in the order shown above
        </div>
      )}

      <div className="action-row">
        <button className="btn-primary" onClick={handleMerge} disabled={files.length < 2 || isProcessing}>
          <Download size={15} /> Merge & Download
        </button>
      </div>
    </div>
  );
};
