import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { addWatermark, downloadPDF } from '../utils/pdfUtils';
import { Download, ArrowLeft } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const Watermark = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#808080');

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const handle = async () => {
    if (!files.length) return toast.error('Please select a PDF file');
    if (!text.trim()) return toast.error('Please enter watermark text');
    setIsProcessing(true);
    try {
      const bytes = await addWatermark(files[0], { text, opacity, fontSize, color: hexToRgb(color) });
      downloadPDF(bytes, 'watermarked.pdf');
      toast.success('Watermark added!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add watermark');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Adding watermark..." />
      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(128,90,213,0.1)', color: '#805ad5' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M12 2c1.5 3 4 5 7 6-1 4-3.5 8-7 10-3.5-2-6-6-7-10 3-1 5.5-3 7-6z"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">Add Watermark</h1>
          <p className="page-subtitle">Add a text watermark to every page of your PDF</p>
        </div>
      </div>
      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Drop a PDF file here" />
      </div>
      {files.length > 0 && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Watermark Text</label>
              <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder="e.g. CONFIDENTIAL" />
            </div>
            <div>
              <label className="label">Font Size: {fontSize}px</label>
              <input type="range" min={16} max={96} value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label className="label">Opacity: {Math.round(opacity * 100)}%</label>
              <input type="range" min={5} max={80} value={Math.round(opacity * 100)} onChange={e => setOpacity(+e.target.value / 100)} style={{ width: '100%' }} />
            </div>
            <div>
              <label className="label">Color</label>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ height: 40, width: '100%', borderRadius: 8, border: '1.5px solid #e2e8f0', cursor: 'pointer' }} />
            </div>
            <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80, padding: 12, position: 'relative', overflow: 'hidden' }}>
              <span style={{ fontWeight: 800, fontSize: Math.max(14, fontSize * 0.4), color, opacity, transform: 'rotate(45deg)', whiteSpace: 'nowrap' }}>{text || 'Preview'}</span>
            </div>
          </div>
        </div>
      )}
      <div className="action-row">
        <button className="btn-primary" onClick={handle} disabled={!files.length || isProcessing}>
          <Download size={15} /> Apply & Download
        </button>
      </div>
    </div>
  );
};
