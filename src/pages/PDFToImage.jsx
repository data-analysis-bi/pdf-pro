import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ArrowLeft, Download, Image as ImageIcon } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const PDFToImage = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState([]);
  const [format, setFormat] = useState('png');
  const [scale, setScale] = useState(2);

  const handle = async () => {
    if (!files.length) return toast.error('Please select a PDF file');
    setIsProcessing(true);
    setImages([]);
    setProgress(0);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const results = [];

      for (let i = 1; i <= numPages; i++) {
        setProgress(Math.round((i / numPages) * 100));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        results.push({ dataUrl, name: `page-${i}.${format}` });
      }

      setImages(results);
      toast.success(`Converted ${numPages} page(s) to ${format.toUpperCase()}!`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to convert PDF: ' + e.message);
    } finally { setIsProcessing(false); setProgress(0); }
  };

  const downloadAll = () => {
    images.forEach(({ dataUrl, name }) => {
      const a = document.createElement('a');
      a.href = dataUrl; a.download = name;
      a.click();
    });
  };

  const downloadOne = ({ dataUrl, name }) => {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = name; a.click();
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      {isProcessing && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-spinner" />
            <p className="overlay-title">Converting pages...</p>
            {progress > 0 && <>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <p className="progress-text">{progress}%</p>
            </>}
          </div>
        </div>
      )}
      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(214,158,46,0.1)', color: '#d69e2e' }}>
          <ImageIcon size={26} />
        </div>
        <div>
          <h1 className="page-title">PDF to Image</h1>
          <p className="page-subtitle">Convert each PDF page to PNG or JPG</p>
        </div>
      </div>
      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Drop a PDF file here" />
      </div>
      {files.length > 0 && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Output Format</label>
              <div className="toggle-tabs">
                <button className={`tab-btn${format === 'png' ? ' active' : ''}`} onClick={() => setFormat('png')}>PNG</button>
                <button className={`tab-btn${format === 'jpg' ? ' active' : ''}`} onClick={() => setFormat('jpg')}>JPG</button>
              </div>
            </div>
            <div>
              <label className="label">Quality Scale: {scale}x</label>
              <input type="range" min={1} max={3} step={0.5} value={scale} onChange={e => setScale(+e.target.value)} style={{ width: '100%', marginTop: 8 }} />
            </div>
          </div>
        </div>
      )}
      <div className="action-row">
        <button className="btn-primary" onClick={handle} disabled={!files.length || isProcessing}>
          Convert to Images
        </button>
      </div>
      {images.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <label className="label" style={{ marginBottom: 0 }}>{images.length} image(s) ready</label>
            <button className="btn-primary" style={{ padding: '7px 16px', fontSize: 13 }} onClick={downloadAll}>
              <Download size={13} /> Download All
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {images.map((img, i) => (
              <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }} onClick={() => downloadOne(img)} title="Click to download">
                <img src={img.dataUrl} alt={img.name} style={{ width: '100%', display: 'block' }} />
                <div style={{ padding: '6px 8px', fontSize: 11, color: '#718096', textAlign: 'center' }}>{img.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
