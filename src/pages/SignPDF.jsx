import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { signPDF, downloadPDF } from '../utils/pdfUtils';
import { Download, ArrowLeft, Trash2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const SignPDF = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);

  useEffect(() => {
    if (!isSigning || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isSigning]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    isDrawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => { isDrawing.current = false; };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handle = async () => {
    if (!files.length) return toast.error('Please select a PDF file');
    const canvas = canvasRef.current;
    if (!canvas) return toast.error('Please draw your signature');
    // Check if canvas is blank
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((v, i) => i % 4 === 3 && v > 0);
    if (!hasContent) return toast.error('Please draw your signature');

    setIsProcessing(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const bytes = await signPDF(files[0], dataUrl, { x: 50, y: 50, width: 200, height: 80, pageIndex: 0 });
      downloadPDF(bytes, 'signed.pdf');
      toast.success('Signature added!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to sign PDF');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Adding signature..." />
      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(43,108,176,0.1)', color: '#2b6cb0' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">Sign PDF</h1>
          <p className="page-subtitle">Draw and embed your signature on a PDF document</p>
        </div>
      </div>
      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Drop a PDF file here" />
      </div>
      {files.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label className="label" style={{ marginBottom: 0 }}>Draw Your Signature</label>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={clearSignature}>
              <Trash2 size={13} /> Clear
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={680}
            height={150}
            style={{ border: '1.5px dashed #cbd5e0', borderRadius: 8, cursor: 'crosshair', touchAction: 'none', width: '100%', background: '#fafafa', display: 'block' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 8 }}>Signature will be placed at the bottom of page 1</p>
        </div>
      )}
      <div className="action-row">
        <button className="btn-primary" onClick={handle} disabled={!files.length || isProcessing}>
          <Download size={15} /> Sign & Download
        </button>
      </div>
    </div>
  );
};
