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
  const [opacity, setOpacity] = useState(0.3);           // 0.0 - 1.0
  const [color, setColor] = useState('#808080');

  // iLovePDF-style options
  const [mode, setMode] = useState('text'); // 'text' | 'image'
  const [position, setPosition] = useState('center');   // center, top-left, top-center, etc.
  const [isMosaic, setIsMosaic] = useState(false);
  const [transparencyLevel, setTransparencyLevel] = useState(30); // 0 = no transparency (opaque), 25, 50, 75
  const [rotation, setRotation] = useState(0);          // 0, 45, 90, 180, 270, -45, etc.
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [layer, setLayer] = useState('over');           // 'over' | 'below'

  // Load page count when file changes
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
    { id: 'top-left', label: '' },
    { id: 'top-center', label: '' },
    { id: 'top-right', label: '' },
    { id: 'middle-left', label: '' },
    { id: 'center', label: '' },
    { id: 'middle-right', label: '' },
    { id: 'bottom-left', label: '' },
    { id: 'bottom-center', label: '' },
    { id: 'bottom-right', label: '' },
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
        opacity: opacity,                    // or calculate from transparencyLevel
        color: hexToRgb(color),
        position,
        mosaic: isMosaic,
        rotation,
        fromPage,
        toPage: Math.min(toPage, pageCount),
        layer,
        // Add image support later: watermarkImage: file
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

  // Live preview opacity (for text only)
  const previewOpacity = mode === 'text' ? opacity : 0.6;

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
        <>
          {/* Watermark Options Panel */}
          <div className="card" style={{ marginTop: 24 }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  className={`tab-btn ${mode === 'text' ? 'active' : ''}`}
                  onClick={() => setMode('text')}
                  style={{ flex: 1 }}
                >
                  <span style={{ marginRight: 6 }}>𝐀</span> Place text
                </button>
                <button
                  className={`tab-btn ${mode === 'image' ? 'active' : ''}`}
                  onClick={() => setMode('image')}
                  style={{ flex: 1 }}
                >
                  Place image
                </button>
              </div>
            </div>

            {mode === 'text' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="label">Text</label>
                  <input
                    className="input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter watermark text"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Font Size: {fontSize}px</label>
                    <input
                      type="range"
                      min={20}
                      max={120}
                      value={fontSize}
                      onChange={(e) => setFontSize(+e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="label">Color</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      style={{ width: '100%', height: 44, borderRadius: 8, cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Position Grid + Mosaic */}
                <div>
                  <label className="label">Position</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8 }}>
                    {positions.map((pos) => (
                      <button
                        key={pos.id}
                        onClick={() => setPosition(pos.id)}
                        className={`position-btn ${position === pos.id ? 'active' : ''}`}
                        style={{
                          height: 52,
                          border: position === pos.id ? '2px solid #3182ce' : '1px solid #cbd5e0',
                          background: position === pos.id ? '#ebf8ff' : '#fff',
                          borderRadius: 6,
                        }}
                      >
                        {pos.id === 'center' ? '●' : ''}
                      </button>
                    ))}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={isMosaic}
                      onChange={(e) => setIsMosaic(e.target.checked)}
                    />
                    Mosaic (repeat across page)
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">Transparency</label>
                    <select
                      value={transparencyLevel}
                      onChange={(e) => {
                        setTransparencyLevel(+e.target.value);
                        setOpacity((100 - +e.target.value) / 100);
                      }}
                      className="input"
                    >
                      <option value={0}>No transparency</option>
                      <option value={25}>25%</option>
                      <option value={50}>50%</option>
                      <option value={75}>75%</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Rotation</label>
                    <select
                      value={rotation}
                      onChange={(e) => setRotation(+e.target.value)}
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

                {/* Pages Range */}
                <div>
                  <label className="label">Pages</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: '#64748b' }}>from page</span>
                      <input
                        type="number"
                        min={1}
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
                        min={1}
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
                  <label className="label">Layer</label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <button
                      onClick={() => setLayer('over')}
                      className={`layer-btn ${layer === 'over' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '12px', borderRadius: 8 }}
                    >
                      Over the PDF content
                    </button>
                    <button
                      onClick={() => setLayer('below')}
                      className={`layer-btn ${layer === 'below' ? 'active' : ''}`}
                      style={{ flex: 1, padding: '12px', borderRadius: 8 }}
                    >
                      Below the PDF content
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                Image watermark support coming soon.<br />
                (Upload image + same position/transparency options)
              </div>
            )}
          </div>

          {/* Live Preview */}
          {mode === 'text' && (
            <div className="card" style={{ marginTop: 16 }}>
              <label className="label">Preview</label>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  height: 180,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    fontSize: Math.max(18, fontSize * 0.45),
                    fontWeight: 700,
                    color,
                    opacity: previewOpacity,
                    transform: `rotate(${rotation}deg)`,
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                  }}
                >
                  {text || 'PREVIEW'}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <div className="action-row">
        <button
          className="btn-primary"
          onClick={handleApply}
          disabled={!files.length || isProcessing}
        >
          <Download size={15} /> Apply & Download
        </button>
      </div>
    </div>
  );
};
