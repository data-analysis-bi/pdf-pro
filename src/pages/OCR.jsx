import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ArrowLeft, Copy, Download } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const OCR = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');

  const handle = async () => {
    if (!files.length) return toast.error('Please select a file');
    setIsProcessing(true);
    setResult('');
    setProgress(0);
    setStatus('Loading OCR engine...');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setStatus(`Recognizing text... ${Math.round(m.progress * 100)}%`);
          } else {
            setStatus(m.status);
          }
        },
      });
      let imageData;
      if (files[0].type === 'application/pdf') {
        // For PDFs convert first page to image via pdfjs
        const pdfjsLib = await import('pdfjs-dist');
        // Use the locally bundled worker (avoids CDN network errors)
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        const arrayBuffer = await files[0].arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        imageData = canvas.toDataURL('image/png');
      } else {
        imageData = files[0];
      }
      setStatus('Extracting text...');
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();
      setResult(text.trim() || 'No text found in the document.');
      toast.success('Text extracted!');
    } catch (e) {
      console.error(e);
      toast.error('OCR failed: ' + e.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatus('');
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(result);
    toast.success('Copied to clipboard!');
  };

  const downloadText = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'extracted_text.txt';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      {isProcessing && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-spinner" />
            <p className="overlay-title">Running OCR...</p>
            <p style={{ fontSize: 13, color: '#a0aec0', marginBottom: 12 }}>{status}</p>
            {progress > 0 && (
              <>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                <p className="progress-text">{progress}%</p>
              </>
            )}
          </div>
        </div>
      )}
      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(44,122,123,0.1)', color: '#2c7a7b' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M9 12h6M9 16h6M17 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2z"/><path d="M9 8h6"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">OCR</h1>
          <p className="page-subtitle">Extract text from scanned PDFs and images</p>
        </div>
      </div>
      <div className="card">
        <FileUploader
          files={files} setFiles={setFiles} multiple={false}
          accept={{ 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }}
          title="Drop a PDF or image here"
          subtitle="Scanned PDFs, PNG, JPG supported"
        />
      </div>
      <div className="action-row">
        <button className="btn-primary" onClick={handle} disabled={!files.length || isProcessing}>
          Extract Text
        </button>
      </div>
      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label className="label" style={{ marginBottom: 0 }}>Extracted Text</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={copyText}><Copy size={13} /> Copy</button>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={downloadText}><Download size={13} /> Save .txt</button>
            </div>
          </div>
          <textarea
            readOnly value={result}
            style={{ width: '100%', minHeight: 200, padding: 14, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', resize: 'vertical', background: '#f7fafc', color: '#2d3748', outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
};
