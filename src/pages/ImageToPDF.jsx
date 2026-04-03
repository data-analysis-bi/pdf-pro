import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { imagesToPDF, downloadPDF } from '../utils/pdfUtils';
import { Download, ArrowLeft } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const ImageToPDF = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConvert = async () => {
    if (!files.length) return toast.error('Please select image files');
    setIsProcessing(true);
    try {
      const bytes = await imagesToPDF(files);
      downloadPDF(bytes, 'images.pdf');
      toast.success('PDF created successfully!');
      setFiles([]);
    } catch (e) {
      console.error(e);
      toast.error('Failed to convert images to PDF. Only PNG and JPG are supported.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Creating PDF..." />
      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(221,107,32,0.1)', color: '#dd6b20' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">Image to PDF</h1>
          <p className="page-subtitle">Create a PDF from JPG, PNG or other images</p>
        </div>
      </div>
      <div className="card">
        <FileUploader
          files={files} setFiles={setFiles} multiple
          accept={{ 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] }}
          title="Drop images here"
          subtitle="PNG, JPG, WebP supported — each image becomes a page"
        />
      </div>
      <div className="action-row">
        <button className="btn-primary" onClick={handleConvert} disabled={!files.length || isProcessing}>
          <Download size={15} /> Convert & Download
        </button>
      </div>
    </div>
  );
};
