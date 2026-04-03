import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { downloadPDF } from '../utils/pdfUtils';
import { 
  ArrowLeft, Download, RotateCw, RotateCcw, 
  Trash2, ArrowUp, ArrowDown, MoveHorizontal,
  CheckCircle2, RefreshCcw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const EditPages = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [order, setOrder] = useState([]); // current page order (0-based original indices)
  const [rotations, setRotations] = useState({}); // { originalIndex: totalDeg }
  const [deleted, setDeleted] = useState(new Set());
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [thumbnails, setThumbnails] = useState({}); // { originalIndex: dataUrl }
  const [activeTab, setActiveTab] = useState('rotate');
  const [loadingThumbs, setLoadingThumbs] = useState(false);

  // Generate thumbnails when file changes
  useEffect(() => {
    const load = async () => {
      if (files.length > 0) {
        setLoadingThumbs(true);
        try {
          const { PDFDocument } = await import('pdf-lib');
          const pdfjsLib = await import('pdfjs-dist');
          
          // Setup worker correctly
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();

          const ab = await files[0].arrayBuffer();
          const doc = await PDFDocument.load(ab);
          const count = doc.getPageCount();
          setPageCount(count);
          setOrder(Array.from({ length: count }, (_, i) => i));
          setRotations({});
          setDeleted(new Set());
          setSelectedPages(new Set());
          
          // Load PDF for thumbnails
          const loadingTask = pdfjsLib.getDocument({ data: ab });
          const pdf = await loadingTask.promise;
          const thumbs = {};
          
          for (let i = 1; i <= count; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.3 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport }).promise;
            thumbs[i - 1] = canvas.toDataURL();
          }
          setThumbnails(thumbs);
        } catch (e) {
          console.error(e);
          toast.error('Failed to load PDF thumbnails');
        } finally {
          setLoadingThumbs(false);
        }
      } else {
        setPageCount(0);
        setOrder([]);
        setRotations({});
        setDeleted(new Set());
        setSelectedPages(new Set());
        setThumbnails({});
      }
    };
    load();
  }, [files]);

  const visibleOrder = order.filter(i => !deleted.has(i));

  const toggleSelection = (idx, e) => {
    const next = new Set(selectedPages);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedPages(next);
  };

  const handleBulkRotate = (deg) => {
    if (selectedPages.size === 0) return toast.error('Select pages to rotate');
    const next = { ...rotations };
    selectedPages.forEach(idx => {
      next[idx] = ((next[idx] || 0) + deg + 360) % 360;
    });
    setRotations(next);
    toast.success(`Rotated ${selectedPages.size} page(s)`);
  };

  const handleBulkDelete = () => {
    if (selectedPages.size === 0) return toast.error('Select pages to delete');
    const next = new Set(deleted);
    selectedPages.forEach(idx => next.add(idx));
    setDeleted(next);
    setSelectedPages(new Set());
    toast.success(`Deleted ${selectedPages.size} page(s)`);
  };

  const handleMove = (direction) => {
    if (selectedPages.size === 0) return toast.error('Select pages to move');
    
    // Sort selected indices based on their current position in visibleOrder
    const selectedArr = Array.from(selectedPages).sort((a, b) => {
      return visibleOrder.indexOf(a) - visibleOrder.indexOf(b);
    });

    let newVisible = [...visibleOrder];
    
    if (direction === 'start') {
      const remaining = newVisible.filter(idx => !selectedPages.has(idx));
      newVisible = [...selectedArr, ...remaining];
    } else if (direction === 'end') {
      const remaining = newVisible.filter(idx => !selectedPages.has(idx));
      newVisible = [...remaining, ...selectedArr];
    } else {
      // Move Left/Right logic
      const moveLeft = direction === 'left';
      const step = moveLeft ? -1 : 1;
      
      // Can't move left if first element is at index 0
      if (moveLeft && newVisible.indexOf(selectedArr[0]) === 0) return;
      // Can't move right if last element is at the end
      if (!moveLeft && newVisible.indexOf(selectedArr[selectedArr.length - 1]) === newVisible.length - 1) return;

      // Extract and swap
      const remaining = newVisible.filter(idx => !selectedPages.has(idx));
      const firstIdx = newVisible.indexOf(selectedArr[0]);
      const lastIdx = newVisible.indexOf(selectedArr[selectedArr.length - 1]);
      
      if (moveLeft) {
        newVisible.splice(firstIdx, selectedArr.length);
        newVisible.splice(firstIdx - 1, 0, ...selectedArr);
      } else {
        newVisible.splice(firstIdx, selectedArr.length);
        newVisible.splice(firstIdx + 1, 0, ...selectedArr);
      }
    }
    
    const deletedArr = Array.from(deleted);
    setOrder([...newVisible, ...deletedArr]);
  };

  const startOver = () => {
    setOrder(Array.from({ length: pageCount }, (_, i) => i));
    setRotations({});
    setDeleted(new Set());
    setSelectedPages(new Set());
    toast.info('Changes reset');
  };

  const handleApply = async () => {
    if (!files.length) return toast.error('Please select a PDF file');
    setIsProcessing(true);
    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const ab = await files[0].arrayBuffer();
      let pdfDoc = await PDFDocument.load(ab);

      const pages = pdfDoc.getPages();
      // Apply rotations stored in state
      Object.entries(rotations).forEach(([idx, angle]) => {
        if (angle) {
          const current = pages[+idx].getRotation().angle;
          pages[+idx].setRotation(degrees((current + angle) % 360));
        }
      });

      const newPdf = await PDFDocument.create();
      const copies = await newPdf.copyPages(pdfDoc, visibleOrder);
      copies.forEach(p => newPdf.addPage(p));

      const bytes = await newPdf.save();
      downloadPDF(bytes, 'edited_pages.pdf');
      toast.success(`Success! Generated PDF with ${visibleOrder.length} pages.`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save changes');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className={`page-container ${files.length > 0 ? 'has-footer' : ''}`}>
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Saving changes..." />
      
      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>

      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(49,151,149,0.1)', color: '#319795' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">Edit Pages</h1>
          <p className="page-subtitle">Rotate, delete, or reorder pages with real-time preview</p>
        </div>
      </div>

      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Drop a PDF file here" />
      </div>

      {files.length > 0 && (
        <>
          <div className="edit-toolbar">
            <div className="edit-tabs">
              <button className={`edit-tab ${activeTab === 'rotate' ? 'active' : ''}`} onClick={() => setActiveTab('rotate')}>Rotate</button>
              <button className={`edit-tab ${activeTab === 'delete' ? 'active' : ''}`} onClick={() => setActiveTab('delete')}>Delete</button>
              <button className={`edit-tab ${activeTab === 'reorder' ? 'active' : ''}`} onClick={() => setActiveTab('reorder')}>Reorder</button>
              <div className="selection-info">
                {selectedPages.size} page(s) selected
              </div>
            </div>

            <div className="edit-actions">
              {activeTab === 'rotate' && (
                <>
                  <button className="action-btn" onClick={() => handleBulkRotate(-90)} disabled={selectedPages.size === 0}>
                    <RotateCcw size={16} /> Rotate Left
                  </button>
                  <button className="action-btn" onClick={() => handleBulkRotate(90)} disabled={selectedPages.size === 0}>
                    <RotateCw size={16} /> Rotate Right
                  </button>
                </>
              )}
              {activeTab === 'delete' && (
                <button className="action-btn" style={{ color: '#e53e3e' }} onClick={handleBulkDelete} disabled={selectedPages.size === 0}>
                  <Trash2 size={16} /> Delete Selected
                </button>
              )}
              {activeTab === 'reorder' && (
                <>
                  <button className="action-btn" onClick={() => handleMove('start')} title="Move to Start" disabled={selectedPages.size === 0}>
                    <ChevronsLeft size={16} />
                  </button>
                  <button className="action-btn" onClick={() => handleMove('left')} disabled={selectedPages.size === 0}>
                    <ChevronLeft size={16} /> Move Left
                  </button>
                  <button className="action-btn" onClick={() => handleMove('right')} disabled={selectedPages.size === 0}>
                    Move Right <ChevronRight size={16} />
                  </button>
                  <button className="action-btn" onClick={() => handleMove('end')} title="Move to End" disabled={selectedPages.size === 0}>
                    <ChevronsRight size={16} />
                  </button>
                </>
              )}
              {selectedPages.size > 0 && (
                <button className="action-btn" onClick={() => setSelectedPages(new Set())} style={{ marginLeft: 'auto' }}>
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          <div className="card" style={{ minHeight: 300, background: 'transparent', border: 'none', padding: 0 }}>
            {loadingThumbs ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#718096' }}>
                <div className="overlay-spinner" style={{ marginBottom: 12 }} />
                <p>Generating page previews...</p>
              </div>
            ) : (
              <div className="thumb-grid">
                {visibleOrder.map((origIdx) => (
                  <div 
                    key={origIdx}
                    className={`thumb-item ${selectedPages.has(origIdx) ? 'selected' : ''}`}
                    onClick={(e) => toggleSelection(origIdx, e)}
                  >
                    <div className="thumb-num">{origIdx + 1}</div>
                    <img 
                      src={thumbnails[origIdx]} 
                      alt={`Page ${origIdx + 1}`} 
                      className="thumb-img"
                      style={{ transform: `rotate(${rotations[origIdx] || 0}deg)`, transition: 'transform 0.2s ease' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <footer className="footer-actions">
            <button className="btn-secondary" onClick={startOver}>
              <RefreshCcw size={16} /> Start Over
            </button>
            <button className="btn-primary" onClick={handleApply} disabled={isProcessing}>
              <Download size={16} /> Apply Changes
            </button>
          </footer>
        </>
      )}
    </div>
  );
};
