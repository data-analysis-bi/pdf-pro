import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { signPDF, downloadPDF, getPDFPageCount } from '../utils/pdfUtils';
import { Download, ArrowLeft, Trash2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const SignPDF = () => {
  const [files, setFiles] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);

  // Load page count when file is selected
  useEffect(() => {
    const loadPageCount = async () => {
      if (files.length > 0) {
        try {
          const count = await getPDFPageCount(files[0]);
          setPageCount(count);
        } catch (err) {
          console.error(err);
          setPageCount(1);
        }
      } else {
        setPageCount(0);
      }
    };
    loadPageCount();
  }, [files]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
  };

  const endDraw = () => {
    isDrawing.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!files.length) return toast.error('Please select a PDF file');

    const canvas = canvasRef.current;
    if (!canvas) return toast.error('Please draw your signature');

    // Check if signature exists
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((value, index) => index % 4 === 3 && value > 50);

    if (!hasContent) return toast.error('Please draw your signature first');

    setIsProcessing(true);

    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      // Place signature nicely at bottom center of first page
      const bytes = await signPDF(files[0], dataUrl, {
        x: 180,           // Adjust these values based on your PDF size
        y: 80,
        width: 280,
        height: 90,
        pageIndex: 0,
      });

      downloadPDF(bytes, `signed_${files[0].name || 'document.pdf'}`);
      toast.success('PDF signed successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to sign the PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Signing PDF..." />

      <Link to="/" className="page-back">
        <ArrowLeft size={14} /> All Tools
      </Link>

      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(43,108,176,0.1)', color: '#2b6cb0' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
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
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label className="label" style={{ marginBottom: 0 }}>
              DRAW YOUR SIGNATURE
            </label>
            <button 
              onClick={clearSignature}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>

          <div style={{ 
            border: '2px dashed #cbd5e0', 
            borderRadius: '12px', 
            background: '#fafafa',
            padding: '12px'
          }}>
            <canvas
              ref={canvasRef}
              width={720}
              height={180}
              style={{
                width: '100%',
                height: '180px',
                borderRadius: '8px',
                cursor: 'crosshair',
                touchAction: 'none',
                background: '#ffffff',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.03)'
              }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>

          <p style={{ 
            fontSize: '13px', 
            color: '#64748b', 
            marginTop: 10, 
            textAlign: 'center' 
          }}>
            Signature will be placed at the bottom of page 1
          </p>
        </div>
      )}

      <div className="action-row">
        <button
          className="btn-primary"
          onClick={handleSign}
          disabled={!files.length || isProcessing}
          style={{ backgroundColor: '#ef4444' }}
        >
          <Download size={15} /> Sign & Download
        </button>
      </div>
    </div>
  );
};
