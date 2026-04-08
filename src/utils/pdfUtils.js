import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

export const getPDFPageCount = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  return pdfDoc.getPageCount();
};

export const splitPDF = async (file, ranges) => {
  const arrayBuffer = await file.arrayBuffer();
  const originalPdf = await PDFDocument.load(arrayBuffer);
  const results = [];
  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i];
    const newPdf = await PDFDocument.create();
    const pageIndices = [];
    for (let p = start - 1; p < end; p++) pageIndices.push(p);
    const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    const bytes = await newPdf.save();
    results.push({ bytes, name: `split-part-${i + 1}.pdf` });
  }
  return results;
};

export const extractPages = async (file, pageNumbers) => {
  const arrayBuffer = await file.arrayBuffer();
  const originalPdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  const pageIndices = pageNumbers.map((n) => n - 1);
  const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return await newPdf.save();
};

export const mergePDFs = async (files) => {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return await mergedPdf.save();
};

export const compressPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');
  return await pdfDoc.save({ useObjectStreams: false });
};

// Rotate pages: rotations is array of { pageIndex (0-based), angle (90,180,270) }
export const rotatePDFPages = async (file, rotations) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  rotations.forEach(({ pageIndex, angle }) => {
    const page = pages[pageIndex];
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  });
  return await pdfDoc.save();
};

// Delete pages: pageIndices is array of 0-based indices to REMOVE
export const deletePages = async (file, pageIndices) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const total = pdfDoc.getPageCount();
  const keepIndices = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !pageIndices.includes(i)
  );
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdfDoc, keepIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return await newPdf.save();
};

// Reorder pages: newOrder is array of 0-based indices in desired order
export const reorderPages = async (file, newOrder) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdfDoc, newOrder);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return await newPdf.save();
};

// Watermark: applies text watermark to all pages
// ==================== IMPROVED WATERMARK FUNCTION ====================
export const addWatermark = async (file, options) => {
  const {
    text = 'CONFIDENTIAL',
    fontSize = 60,
    color = { r: 0, g: 0, b: 0 },
    opacity = 0.3,
    position = 'center',
    mosaic = false,
    rotation = 45,
    fromPage = 1,
    toPage = 1,
    layer = 'over',        // 'over' or 'below'
  } = options;

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const startPage = Math.max(0, fromPage - 1);
  const endPage = Math.min(pages.length, toPage);

  for (let i = startPage; i < endPage; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    let x, y;

    // Calculate position
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = fontSize * 0.75; // Approximate height

    switch (position) {
      case 'top-left':
        x = 40;
        y = height - 60;
        break;
      case 'top-center':
        x = (width - textWidth) / 2;
        y = height - 60;
        break;
      case 'top-right':
        x = width - textWidth - 40;
        y = height - 60;
        break;
      case 'middle-left':
        x = 40;
        y = height / 2;
        break;
      case 'center':
        x = (width - textWidth) / 2;
        y = height / 2;
        break;
      case 'middle-right':
        x = width - textWidth - 40;
        y = height / 2;
        break;
      case 'bottom-left':
        x = 40;
        y = 60;
        break;
      case 'bottom-center':
        x = (width - textWidth) / 2;
        y = 60;
        break;
      case 'bottom-right':
        x = width - textWidth - 40;
        y = 60;
        break;
      default:
        x = (width - textWidth) / 2;
        y = height / 2;
    }

    // Draw the watermark
    page.drawText(text.toUpperCase(), {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(rotation),
    });

    // Mosaic mode - draw multiple times with offset
    if (mosaic) {
      const offset = fontSize * 1.8;
      // Draw additional copies in a grid pattern
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (dx === 0 && dy === 0) continue;
          page.drawText(text.toUpperCase(), {
            x: x + dx * offset,
            y: y + dy * offset * 0.6,
            size: fontSize * 0.85,
            font,
            color: rgb(color.r, color.g, color.b),
            opacity: opacity * 0.6,
            rotate: degrees(rotation),
          });
        }
      }
    }
  }

  return await pdfDoc.save();
};

// Protect PDF with user password
export const protectPDF = async (file, userPassword) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  // pdf-lib v1 has basic encryption support
  const bytes = await pdfDoc.save({
    userPassword,
    ownerPassword: userPassword + '_owner',
    permissions: {
      printing: 'lowResolution',
      modifying: false,
      copying: false,
      annotating: false,
    },
  });
  return bytes;
};

// Embed signature (PNG data URL) onto PDF
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

  // Load PDF page count
  useEffect(() => {
    const loadPages = async () => {
      if (files.length > 0) {
        try {
          const count = await getPDFPageCount(files[0]);
          setPageCount(count);
        } catch (err) {
          setPageCount(1);
        }
      }
    };
    loadPages();
  }, [files]);

  // Setup canvas styles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3.5;
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
    lastPos.current = getPos(e, canvasRef.current);
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

    // Check if user actually drew something
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasDrawing = imageData.data.some((val, i) => i % 4 === 3 && val > 80);

    if (!hasDrawing) return toast.error('Please draw your signature');

    setIsProcessing(true);

    try {
      const signatureDataUrl = canvas.toDataURL('image/png', 1.0);

      // Smart signing - centered at bottom of first page
      const bytes = await signPDF(files[0], signatureDataUrl, {
        width: 320,
        height: 100,
        pageIndex: 0,
      });

      downloadPDF(bytes, `signed_${files[0].name || 'document.pdf'}`);
      toast.success('PDF signed successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to sign PDF');
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
            <label className="label" style={{ marginBottom: 0 }}>DRAW YOUR SIGNATURE</label>
            <button 
              onClick={clearSignature}
              className="btn-secondary"
              style={{ padding: '6px 16px', fontSize: '13px' }}
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>

          <div style={{ 
            border: '2px dashed #cbd5e0', 
            borderRadius: '12px', 
            background: '#fafafa',
            padding: '16px'
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
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.04)'
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
            Your signature will be placed at the bottom center of page 1
          </p>
        </div>
      )}

      <div className="action-row">
        <button
          className="btn-primary"
          onClick={handleSign}
          disabled={!files.length || isProcessing}
        >
          <Download size={15} /> Sign & Download
        </button>
      </div>
    </div>
  );
};
  // Convert data URL to bytes
  const response = await fetch(signatureDataUrl);
  const imgBytes = await response.arrayBuffer();
  const image = await pdfDoc.embedPng(imgBytes);
  const pages = pdfDoc.getPages();
  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const { height: pageH } = page.getSize();
  page.drawImage(image, {
    x,
    y: pageH - y - height,
    width,
    height,
  });
  return await pdfDoc.save();
};

// Image to PDF
export const imagesToPDF = async (files) => {
  const pdfDoc = await PDFDocument.create();
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let image;
    if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(bytes);
    } else {
      image = await pdfDoc.embedJpg(bytes);
    }
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return await pdfDoc.save();
};

export const downloadPDF = (bytes, fileName) => {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadFile = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
