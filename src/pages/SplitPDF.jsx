import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/FileUploader';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getPDFPageCount, splitPDF, extractPages, downloadPDF } from '../utils/pdfUtils';
import { Download, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export const SplitPDF = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [splitMode, setSplitMode] = useState('range');
  const [ranges, setRanges] = useState([{ start: 1, end: 1 }]);
  const [extractPages2, setExtractPages2] = useState('');

  useEffect(() => {
    const load = async () => {
      if (files.length > 0) {
        try {
          const count = await getPDFPageCount(files[0]);
          setPageCount(count);
          setRanges([{ start: 1, end: count }]);
        } catch (err) {
          console.error("Failed to get page count:", err);
          setPageCount(0);
          setRanges([{ start: 1, end: 1 }]);
        }
      } else {
        setPageCount(0);
        setRanges([{ start: 1, end: 1 }]);
      }
    };
    load();
  }, [files]);

  const addRange = () => {
    setRanges([...ranges, { start: 1, end: pageCount || 1 }]);
  };

  const removeRange = (i) => {
    if (ranges.length > 1) {
      setRanges(ranges.filter((_, idx) => idx !== i));
    }
  };

  /**
   * Allows user to clear the input field completely while typing
   * Only clamps the value when it's a valid number
   */
  const updateRange = (i, field, value) => {
    const r = [...ranges];

    if (value === '') {
      r[i][field] = '';           // Allow clearing the field
      setRanges(r);
      return;
    }

    const num = parseInt(value);
    if (!isNaN(num)) {
      r[i][field] = Math.max(1, Math.min(pageCount || 1, num));
    }

    setRanges(r);
  };

  /**
   * Handles blur event (when user clicks away from the input)
   * - Fixes empty or invalid values
   * - Smart logic for "To Page": cannot be less than "From Page"
   */
  const handleBlur = (i, field) => {
    const r = [...ranges];
    let current = r[i][field];

    // Fix empty or invalid values
    if (current === '' || isNaN(current)) {
      if (field === 'start') {
        r[i].start = 1;
      } else {
        // For "To Page", set to max of start or total pages
        r[i].end = Math.max(r[i].start || 1, pageCount || 1);
      }
    } else {
      // Final safety clamp
      r[i][field] = Math.max(1, Math.min(pageCount || 1, current));
    }

    // === Smart "To Page" logic ===
    // If To Page is smaller than From Page, automatically fix it
    if (r[i].start > r[i].end) {
      r[i].end = r[i].start;
    }

    // If From Page is changed to be larger than To Page, fix To Page
    if (field === 'start' && r[i].start > r[i].end) {
      r[i].end = r[i].start;
    }

    setRanges(r);
  };

  const handleSplit = async () => {
    if (!files.length) return toast.error('Please select a PDF file');

    if (splitMode === 'range') {
      for (const range of ranges) {
        if (!range.start || !range.end) {
          return toast.error('Please fill in all page numbers');
        }
        if (range.start > range.end) {
          return toast.error('From Page cannot be greater than To Page');
        }
      }
    }

    setIsProcessing(true);
    setProgress(20);

    try {
      if (splitMode === 'range') {
        const results = await splitPDF(files[0], ranges);
        setProgress(80);
        results.forEach((r) => downloadPDF(r.bytes, r.name));
        toast.success(`Split into ${results.length} file(s)!`);
      } else {
        const nums = extractPages2
          .split(',')
          .map((n) => parseInt(n.trim()))
          .filter((n) => !isNaN(n) && n >= 1 && n <= pageCount);

        if (!nums.length) return toast.error('Enter valid page numbers');

        const bytes = await extractPages(files[0], nums);
        setProgress(80);
        downloadPDF(bytes, 'extracted.pdf');
        toast.success('Pages extracted!');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to process PDF');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="page-container">
      <Toaster position="top-center" richColors />
      <ProcessingOverlay isProcessing={isProcessing} progress={progress} message="Splitting PDF..." />

      <Link to="/" className="page-back">
        <ArrowLeft size={14} /> All Tools
      </Link>

      <div className="page-header">
        <div className="page-icon" style={{ background: 'rgba(49,130,206,0.1)', color: '#3182ce' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={26} height={26}>
            <path d="M12 3v18M3 12l4-4m0 0l4-4M3 12l4 4m-4-4h6M21 12l-4-4m0 0l-4-4M21 12l-4 4m4-4h-6" />
          </svg>
        </div>
        <div>
          <h1 className="page-title">Split PDF</h1>
          <p className="page-subtitle">Extract pages or split your PDF into multiple files</p>
        </div>
      </div>

      <div className="card">
        <FileUploader files={files} setFiles={setFiles} multiple={false} title="Drop a PDF file here" />
      </div>

      {files.length > 0 && pageCount > 0 && (
        <div className="card">
          <div className="info-box">
            PDF has <strong>{pageCount}</strong> page{pageCount !== 1 ? 's' : ''}
          </div>

          <div className="toggle-tabs">
            <button
              className={`tab-btn${splitMode === 'range' ? ' active' : ''}`}
              onClick={() => setSplitMode('range')}
            >
              Split by Range
            </button>
            <button
              className={`tab-btn${splitMode === 'extract' ? ' active' : ''}`}
              onClick={() => setSplitMode('extract')}
            >
              Extract Pages
            </button>
          </div>

          {splitMode === 'range' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ranges.map((range, i) => (
                <div key={i} className="range-row">
                  <div className="field">
                    <label className="label">From Page</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max={pageCount}
                      value={range.start ?? ''}
                      onChange={(e) => updateRange(i, 'start', e.target.value)}
                      onBlur={() => handleBlur(i, 'start')}
                    />
                  </div>
                  <div className="field">
                    <label className="label">To Page</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max={pageCount}
                      value={range.end ?? ''}
                      onChange={(e) => updateRange(i, 'end', e.target.value)}
                      onBlur={() => handleBlur(i, 'end')}
                    />
                  </div>
                  {ranges.length > 1 && (
                    <button
                      onClick={() => removeRange(i)}
                      className="file-remove"
                      style={{ width: 40, height: 40, marginBottom: 0, flexShrink: 0 }}
                      title="Remove range"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
              <button
                className="btn-secondary"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                onClick={addRange}
              >
                <Plus size={15} /> Add Range
              </button>
            </div>
          ) : (
            <div>
              <label className="label">Page Numbers (comma-separated)</label>
              <input
                className="input"
                value={extractPages2}
                onChange={(e) => setExtractPages2(e.target.value)}
                placeholder="e.g. 1, 3, 5"
              />
              <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 6 }}>
                Pages numbered from 1 to {pageCount}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="action-row">
        <button
          className="btn-primary"
          onClick={handleSplit}
          disabled={!files.length || isProcessing}
        >
          <Download size={15} /> Split & Download
        </button>
      </div>
    </div>
  );
};