import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { addWatermark, getPDFPageCount, downloadPDF } from '../utils/pdfUtils';
import { Download, ArrowLeft } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const Watermark = () => {
  const [files, setFiles] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Text watermark options
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ef4444'); // Default red like your screenshot
  const [opacity, setOpacity] = useState(0.3);

  // iLovePDF-style options
  const [mode, setMode] = useState('text'); // 'text' | 'image'
  const [position, setPosition] = useState('center');
  const [isMosaic, setIsMosaic] = useState(false);
  const [transparencyLevel, setTransparencyLevel] = useState(0); // 0 = No transparency
  const [rotation, setRotation] = useState(0);
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [layer, setLayer] = useState('over'); // 'over' | 'below'

  // Load PDF page count
  useEffect(() => {
    const loadPages = async () => {
      if (files.length > 0) {
        try {
          const count = await getPDFPageCount(files[0]);
          setPageCount(count);
          setToPage(count);
        } catch (err) {
          console.error(err);
          setPageCount(0);
        }
      } else {
        setPageCount(0);
      }
    };
    loadPages();
  }, [files]);

  const positions = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ];

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const handleApply = async () => {
    if (!files.length) return toast.error('Please select a PDF file');
    if (mode === 'text' && !text.trim()) return toast.error('Please enter watermark text');

    setIsProcessing(true);

    try {
      const options = {
        mode,
        text: text.trim(),
        fontSize,
        color: hexToRgb(color),
        opacity: (100 - transparencyLevel) / 100,   // Convert transparency to opacity
        position,
        mosaic: isMosaic,
        rotation,
        fromPage,
        toPage: Math.min(toPage || 1, pageCount || 1),
        layer,
      };

      const bytes = await addWatermark(files[0], options);
      downloadPDF(bytes, 'watermarked.pdf');
      toast.success('Watermark added successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add watermark');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Adding watermark..." />

      <Link to="/" className="page-back">
        <ArrowLeft size={14} /> All Tools
      </Link>

      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(128,90,213,0.1)', color: '#805ad5' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M12 2c1.5 3 4 5 7 6-1 4-3.5 8-7 10-3.5-2-6-6-7-10 3-1 5.5-3 7-6z" />
          </svg>
        </div>
        <div>
          <h1 className="page-title">Add Watermark</h1>
          <p className="page-subtitle">Add a text or image watermark to your PDF</p>
        </div>
      </div>

      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Drop a PDF file here" />
      </div>

      {files.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
            <button
              onClick={() => setMode('text')}
              className={`tab-btn ${mode === 'text' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '14px',
                background: mode === 'text' ? '#ef4444' : 'transparent',
                color: mode === 'text' ? 'white' : '#64748b',
                border: 'none',
                fontWeight: 600,
                borderRadius: '8px 8px 0 0'
              }}
            >
              <span style={{ marginRight: 6 }}>𝐀</span> Place text
            </button>
            <button
              onClick={() => setMode('image')}
              className={`tab-btn ${mode === 'image' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '14px',
                background: mode === 'image' ? '#ef4444' : 'transparent',
                color: mode === 'image' ? 'white' : '#64748b',
                border: 'none',
                fontWeight: 600,
                borderRadius: '8px 8px 0 0'
              }}
            >
              Place image
            </button>
          </div>

          {mode === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Text Input */}
              <div>
                <label className="label">TEXT</label>
                <input
                  className="input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter watermark text"
                />
              </div>

              {/* Font Size & Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">FONT SIZE: {fontSize}px</label>
                  <input
                    type="range"
                    min={20}
                    max={150}
                    value={fontSize}
                    onChange={(e) => setFontSize(+e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="label">COLOR</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: '100%', height: 48, borderRadius: 8, cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Position Grid */}
              <div>
                <label className="label">POSITION</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
                  {positions.map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPosition(pos)}
                      className={`position-btn ${position === pos ? 'active' : ''}`}
                      style={{
                        height: 52,
                        border: position === pos ? '2px solid #3b82f6' : '1px solid #cbd5e0',
                        background: position === pos ? '#dbeafe' : '#fff',
                        borderRadius: 8,
                        fontSize: 18,
                      }}
                    >
                      {pos === 'center' ? '●' : ''}
                    </button>
                  ))}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isMosaic}
                    onChange={(e) => setIsMosaic(e.target.checked)}
                  />
                  Mosaic (repeat across page)
                </label>
              </div>

              {/* Transparency & Rotation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">TRANSPARENCY</label>
                  <select
                    value={transparencyLevel}
                    onChange={(e) => setTransparencyLevel(Number(e.target.value))}
                    className="input"
                  >
                    <option value={0}>No transparency</option>
                    <option value={25}>25%</option>
                    <option value={50}>50%</option>
                    <option value={75}>75%</option>
                  </select>
                </div>
                <div>
                  <label className="label">ROTATION</label>
                  <select
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="input"
                  >
                    <option value={0}>Do not rotate</option>
                    <option value={45}>45°</option>
                    <option value={90}>90°</option>
                    <option value={180}>180°</option>
                    <option value={270}>270°</option>
                    <option value={-45}>-45°</option>
                  </select>
                </div>
              </div>

              {/* Pages */}
              <div>
                <label className="label">PAGES</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>from page</span>
                    <input
                      type="number"
                      min="1"
                      max={pageCount}
                      value={fromPage}
                      onChange={(e) => setFromPage(Math.max(1, Math.min(pageCount, +e.target.value || 1)))}
                      className="input"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>to</span>
                    <input
                      type="number"
                      min="1"
                      max={pageCount}
                      value={toPage}
                      onChange={(e) => setToPage(Math.max(1, Math.min(pageCount, +e.target.value || 1)))}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* Layer */}
              <div>
                <label className="label">LAYER</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button
                    onClick={() => setLayer('over')}
                    className={`layer-btn ${layer === 'over' ? 'active' : ''}`}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: layer === 'over' ? '2px solid #3b82f6' : '1px solid #cbd5e0',
                      background: layer === 'over' ? '#dbeafe' : '#fff',
                      borderRadius: 8,
                      fontWeight: 500,
                    }}
                  >
                    Over the PDF content
                  </button>
                  <button
                    onClick={() => setLayer('below')}
                    className={`layer-btn ${layer === 'below' ? 'active' : ''}`}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: layer === 'below' ? '2px solid #3b82f6' : '1px solid #cbd5e0',
                      background: layer === 'below' ? '#dbeafe' : '#fff',
                      borderRadius: 8,
                      fontWeight: 500,
                    }}
                  >
                    Below the PDF content
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === 'image' && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              Image watermark support coming soon
            </div>
          )}

          {/* Preview */}
          {mode === 'text' && (
            <div className="card" style={{ marginTop: 24 }}>
              <label className="label">PREVIEW</label>
              <div
                style={{
                  background: '#f8fafc',
                  border: '2px dashed #e2e8f0',
                  borderRadius: 12,
                  height: 160,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    fontSize: Math.max(24, fontSize * 0.5),
                    fontWeight: 700,
                    color,
                    opacity: (100 - transparencyLevel) / 100,
                    transform: `rotate(${rotation}deg)`,
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    letterSpacing: 4,
                  }}
                >
                  {text || 'PREVIEW'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="action-row">
        <button
          className="btn-primary"
          onClick={handleApply}
          disabled={!files.length || isProcessing}
          style={{ backgroundColor: '#ef4444' }}
        >
          <Download size={15} /> Apply & Download
        </button>
      </div>
    </div>
  );
};
