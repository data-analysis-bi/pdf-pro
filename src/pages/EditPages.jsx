import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { downloadPDF } from '../utils/pdfUtils';
import { 
  ArrowLeft, Download, RotateCw, RotateCcw, 
  Trash2, ArrowUp, ArrowDown, MoveHorizontal,
  CheckCircle2, RefreshCcw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Loader2, MousePointer2
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
  const [loadProgress, setLoadProgress] = useState(0);

  const abortControllerRef = useRef(null);

  // Generate thumbnails when file changes
  useEffect(() => {
    const load = async () => {
      if (files.length > 0) {
        // Abort previous loading if any
        if (abortControllerRef.current) abortControllerRef.current.abort();
        
        setLoadingThumbs(true);
        setLoadProgress(0);
        setThumbnails({});
        
        try {
          const pdfjsLib = await import('pdfjs-dist');
          
          // CRITICAL: Setup worker correctly for Vite
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();

          const ab = await files[0].arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: ab });
          const pdf = await loadingTask.promise;
          const count = pdf.numPages;
          
          setPageCount(count);
          setOrder(Array.from({ length: count }, (_, i) => i));
          setRotations({});
          setDeleted(new Set());
          setSelectedPages(new Set());
          
          // Generate thumbnails one by one to keep UI responsive
          for (let i = 1; i <= count; i++) {
            const page = await pdf.getPage(i);
            // High quality thumbnail
            const viewport = page.getViewport({ scale: 0.4 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/webp', 0.8);
            
            setThumbnails(prev => ({ ...prev, [i - 1]: dataUrl }));
            setLoadProgress(Math.round((i / count) * 100));
            
            // cleanup page memory
            page.cleanup();
          }
        } catch (e) {
          if (e.name === 'AbortError') return;
          console.error('Thumbnail error:', e);
          toast.error('Could not generate page previews. Please try another PDF.');
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
        setLoadProgress(0);
      }
    };
    load();
    
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [files]);

  const visibleOrder = order.filter(i => !deleted.has(i));

  const toggleSelection = (idx) => {
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
  };

  const handleBulkDelete = () => {
    if (selectedPages.size === 0) return toast.error('Select pages to delete');
    const next = new Set(deleted);
    selectedPages.forEach(idx => next.add(idx));
    setDeleted(next);
    setSelectedPages(new Set());
    toast.success(`Removed ${selectedPages.size} page(s)`);
  };

  const handleMove = (direction) => {
    if (selectedPages.size === 0) return toast.error('Select pages to move');
    
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
      const moveLeft = direction === 'left';
      const firstIdxInVisible = newVisible.indexOf(selectedArr[0]);
      const lastIdxInVisible = newVisible.indexOf(selectedArr[selectedArr.length - 1]);
      
      if (moveLeft && firstIdxInVisible === 0) return;
      if (!moveLeft && lastIdxInVisible === newVisible.length - 1) return;

      const remaining = newVisible.filter(idx => !selectedPages.has(idx));
      const insertAt = moveLeft ? firstIdxInVisible - 1 : firstIdxInVisible + 1;
      
      remaining.splice(insertAt, 0, ...selectedArr);
      newVisible = remaining;
    }
    
    const deletedArr = Array.from(deleted);
    setOrder([...newVisible, ...deletedArr]);
  };

  const startOver = () => {
    setOrder(Array.from({ length: pageCount }, (_, i) => i));
    setRotations({});
    setDeleted(new Set());
    setSelectedPages(new Set());
    toast.info('All changes reset');
  };

  const handleApply = async () => {
    if (!files.length) return toast.error('Please select a PDF file');
    setIsProcessing(true);
    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const ab = await files[0].arrayBuffer();
      let pdfDoc = await PDFDocument.load(ab);

      const pages = pdfDoc.getPages();
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
      toast.success('Successfully generated edited PDF!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save changes');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className={`page-container ${files.length > 0 ? 'has-footer' : ''}`}>
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Saving your PDF..." />
      
      <Link to="/" className="page-back"><ArrowLeft size={14} /> Back to Tools</Link>

      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(56,161,105,0.1)', color: '#319795' }}>
          <RotateCcw size={26} />
        </div>
        <div>
          <h1 className="page-title">Edit PDF Pages</h1>
          <p className="page-subtitle">Rotate, delete, or organize your PDF in seconds</p>
        </div>
      </div>

      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Choose a PDF file" />
      </div>

      {files.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div className="edit-toolbar">
            <div className="edit-tabs">
              <button className={`edit-tab ${activeTab === 'rotate' ? 'active' : ''}`} onClick={() => setActiveTab('rotate')}>Rotate</button>
              <button className={`edit-tab ${activeTab === 'delete' ? 'active' : ''}`} onClick={() => setActiveTab('delete')}>Delete</button>
              <button className={`edit-tab ${activeTab === 'reorder' ? 'active' : ''}`} onClick={() => setActiveTab('reorder')}>Reorder</button>
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
                <button className="action-btn" style={{ color: '#ef4444' }} onClick={handleBulkDelete} disabled={selectedPages.size === 0}>
                  <Trash2 size={16} /> Delete Selected
                </button>
              )}
              {activeTab === 'reorder' && (
                <>
                  <button className="action-btn" onClick={() => handleMove('start')} title="Move to First" disabled={selectedPages.size === 0}>
                    <ChevronsLeft size={16} />
                  </button>
                  <button className="action-btn" onClick={() => handleMove('left')} disabled={selectedPages.size === 0}>
                    <ChevronLeft size={16} /> Left
                  </button>
                  <button className="action-btn" onClick={() => handleMove('right')} disabled={selectedPages.size === 0}>
                    Right <ChevronRight size={16} />
                  </button>
                  <button className="action-btn" onClick={() => handleMove('end')} title="Move to Last" disabled={selectedPages.size === 0}>
                    <ChevronsRight size={16} />
                  </button>
                </>
              )}
              
              <div className="selection-info">
                {selectedPages.size > 0 ? (
                  <button 
                  onClick={() => setSelectedPages(new Set())}
                  style={{ background: 'none', border: 'none', color: '#e53e3e', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <MousePointer2 size={12} /> Clear {selectedPages.size} Selected
                </button>
                ) : (
                  'Select pages to edit'
                )}
              </div>
            </div>
          </div>

          <div style={{ minHeight: 400, marginTop: 20 }}>
            {loadingThumbs && loadProgress < 100 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#64748b' }}>
                <Loader2 size={32} className="overlay-spinner" style={{ marginBottom: 16 }} />
                <p style={{ fontWeight: 600 }}>Loading previews... {loadProgress}%</p>
              </div>
            )}
            
            <div className="thumb-grid">
              {visibleOrder.map((origIdx) => (
                <div 
                  key={origIdx}
                  className={`thumb-item ${selectedPages.has(origIdx) ? 'selected' : ''}`}
                  onClick={() => toggleSelection(origIdx)}
                >
                  <div className="thumb-img-wrap">
                    <div className="thumb-num">{origIdx + 1}</div>
                    {thumbnails[origIdx] ? (
                      <img 
                        src={thumbnails[origIdx]} 
                        alt={`Page ${origIdx + 1}`} 
                        className="thumb-img"
                        style={{ transform: `rotate(${rotations[origIdx] || 0}deg)` }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 size={20} className="overlay-spinner" style={{ opacity: 0.3 }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <footer className="footer-actions">
            <button className="btn-secondary" onClick={startOver} style={{ padding: '12px 24px' }}>
              <RefreshCcw size={16} /> Reset All
            </button>
            <button className="btn-primary" onClick={handleApply} disabled={isProcessing} style={{ padding: '12px 32px', boxShadow: '0 10px 15px -3px rgba(229, 62, 62, 0.4)' }}>
              <Download size={16} /> Save & Download
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};
