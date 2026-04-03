import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { rotatePDFPages, deletePages, reorderPages, downloadPDF } from '../utils/pdfUtils';
import { ArrowLeft, Download, RotateCw, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast, Toaster } from 'sonner';

function PageThumb({ pageNum, isSelected, onToggle, onRotate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, idx }) {
  return (
    <div style={{
      border: `2px solid ${isSelected ? '#e53e3e' : '#e2e8f0'}`,
      borderRadius: 10,
      padding: 12,
      background: isSelected ? 'rgba(229,62,62,0.05)' : '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'all 0.15s',
    }}>
      <div onClick={onToggle} style={{
        width: 60, height: 80,
        background: '#f7fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: '#718096', fontWeight: 600,
      }}>p.{pageNum}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button title="Rotate" onClick={onRotate} style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#718096', display: 'flex', alignItems: 'center' }}>
          <RotateCw size={13} />
        </button>
        {!isFirst && <button title="Move Up" onClick={onMoveUp} style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#718096', display: 'flex' }}><ArrowUp size={13} /></button>}
        {!isLast && <button title="Move Down" onClick={onMoveDown} style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#718096', display: 'flex' }}><ArrowDown size={13} /></button>}
        <button title="Delete" onClick={onDelete} style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#e53e3e', display: 'flex' }}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

export const EditPages = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [order, setOrder] = useState([]); // current page order (0-based original indices)
  const [rotations, setRotations] = useState({}); // { originalIndex: totalDeg }
  const [deleted, setDeleted] = useState(new Set());

  useEffect(() => {
    const load = async () => {
      if (files.length > 0) {
        const { PDFDocument } = await import('pdf-lib');
        const ab = await files[0].arrayBuffer();
        const doc = await PDFDocument.load(ab);
        const count = doc.getPageCount();
        setPageCount(count);
        setOrder(Array.from({ length: count }, (_, i) => i));
        setRotations({});
        setDeleted(new Set());
      } else {
        setPageCount(0);
        setOrder([]);
        setRotations({});
        setDeleted(new Set());
      }
    };
    load();
  }, [files]);

  const visibleOrder = order.filter(i => !deleted.has(i));

  const handleRotate = (origIdx) => {
    setRotations(prev => ({ ...prev, [origIdx]: ((prev[origIdx] || 0) + 90) % 360 }));
  };

  const handleDelete = (origIdx) => {
    setDeleted(prev => new Set([...prev, origIdx]));
  };

  const handleMoveUp = (posInVisible) => {
    const newVisible = [...visibleOrder];
    [newVisible[posInVisible - 1], newVisible[posInVisible]] = [newVisible[posInVisible], newVisible[posInVisible - 1]];
    const deletedArr = [...deleted];
    setOrder([...newVisible, ...deletedArr]);
  };

  const handleMoveDown = (posInVisible) => {
    const newVisible = [...visibleOrder];
    [newVisible[posInVisible], newVisible[posInVisible + 1]] = [newVisible[posInVisible + 1], newVisible[posInVisible]];
    const deletedArr = [...deleted];
    setOrder([...newVisible, ...deletedArr]);
  };

  const handleApply = async () => {
    if (!files.length) return toast.error('Please select a PDF file');
    setIsProcessing(true);
    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const ab = await files[0].arrayBuffer();
      let pdfDoc = await PDFDocument.load(ab);

      // First apply rotations
      const pages = pdfDoc.getPages();
      Object.entries(rotations).forEach(([idx, angle]) => {
        if (angle) {
          const current = pages[+idx].getRotation().angle;
          pages[+idx].setRotation(degrees((current + angle) % 360));
        }
      });

      // Then reorder (excluding deleted)
      const newPdf = await PDFDocument.create();
      const copies = await newPdf.copyPages(pdfDoc, visibleOrder);
      copies.forEach(p => newPdf.addPage(p));

      const bytes = await newPdf.save();
      downloadPDF(bytes, 'edited_pages.pdf');
      toast.success(`PDF saved with ${visibleOrder.length} page(s)!`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to edit pages');
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} message="Editing pages..." />
      <Link to="/" className="page-back"><ArrowLeft size={14} /> All Tools</Link>
      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(49,151,149,0.1)', color: '#319795' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
          </svg>
        </div>
        <div>
          <h1 className="page-title">Edit Pages</h1>
          <p className="page-subtitle">Rotate, delete, or reorder pages in your PDF</p>
        </div>
      </div>
      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Drop a PDF file here" />
      </div>
      {pageCount > 0 && (
        <div className="card">
          <div className="info-box" style={{ marginBottom: 16 }}>
            Showing {visibleOrder.length} of {pageCount} pages. Deleted: {deleted.size}.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
            {visibleOrder.map((origIdx, pos) => (
              <PageThumb
                key={origIdx}
                pageNum={origIdx + 1}
                isSelected={false}
                onToggle={() => {}}
                onRotate={() => handleRotate(origIdx)}
                onDelete={() => handleDelete(origIdx)}
                onMoveUp={() => handleMoveUp(pos)}
                onMoveDown={() => handleMoveDown(pos)}
                isFirst={pos === 0}
                isLast={pos === visibleOrder.length - 1}
                idx={pos}
              />
            ))}
          </div>
        </div>
      )}
      <div className="action-row">
        <button className="btn-primary" onClick={handleApply} disabled={!files.length || isProcessing}>
          <Download size={15} /> Save Changes
        </button>
      </div>
    </div>
  );
};
