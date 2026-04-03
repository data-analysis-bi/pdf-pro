import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { mergePDFs, compressPDF, addWatermark, downloadPDF } from '../utils/pdfUtils';
import { Download, ArrowLeft, Play } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const OPERATIONS = [
  { id: 'merge', label: 'Merge all into one PDF' },
  { id: 'compress', label: 'Compress each PDF' },
  { id: 'watermark', label: 'Add watermark to each PDF' },
];

export const BatchProcess = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [operation, setOperation] = useState('merge');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');

  const handle = async () => {
    if (!files.length) return toast.error('Please select PDF files');
    if (operation === 'merge' && files.length < 2) return toast.error('Select at least 2 files to merge');
    setIsProcessing(true);
    setProgress(10);
    try {
      if (operation === 'merge') {
        const bytes = await mergePDFs(files);
        setProgress(90);
        downloadPDF(bytes, 'batch_merged.pdf');
        toast.success(`Merged ${files.length} PDFs!`);
      } else if (operation === 'compress') {
        for (let i = 0; i < files.length; i++) {
          const bytes = await compressPDF(files[i]);
          downloadPDF(bytes, `compressed_${files[i].name}`);
          setProgress(Math.round(((i + 1) / files.length) * 100));
        }
        toast.success(`Compressed ${files.length} PDFs!`);
      } else if (operation === 'watermark') {
        for (let i = 0; i < files.length; i++) {
          const bytes = await addWatermark(files[i], { text: watermarkText, opacity: 0.3, fontSize: 48 });
          downloadPDF(bytes, `watermarked_${files[i].name}`);
          setProgress(Math.round(((i + 1) / files.length) * 100));
        }
        toast.success(`Added watermark to ${files.length} PDFs!`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Batch processing failed');
    } finally { setIsProcessing(false); setProgress(0); }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} progress={progress} message="Processing files..." />
      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(229,62,62,0.1)', color: '#e53e3e' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">Batch Process</h1>
          <p className="page-subtitle">Apply an operation to multiple PDF files at once</p>
        </div>
      </div>
      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple title="Drop PDF files here" subtitle="Add multiple PDFs to process them all at once" />
      </div>
      {files.length > 0 && (
        <div className="card">
          <label className="label">Operation</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {OPERATIONS.map(op => (
              <label key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                <input type="radio" name="operation" value={op.id} checked={operation === op.id} onChange={() => setOperation(op.id)} />
                {op.label}
              </label>
            ))}
          </div>
          {operation === 'watermark' && (
            <div style={{ marginTop: 16 }}>
              <label className="label">Watermark Text</label>
              <input className="input" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} placeholder="e.g. CONFIDENTIAL" />
            </div>
          )}
        </div>
      )}
      <div className="action-row">
        <button className="btn-primary" onClick={handle} disabled={!files.length || isProcessing}>
          <Play size={15} /> Run Batch
        </button>
      </div>
    </div>
  );
};
