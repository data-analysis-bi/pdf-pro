import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { SplitPDF } from './pages/SplitPDF';
import { MergePDF } from './pages/MergePDF';
import { CompressPDF } from './pages/CompressPDF';
import { PDFToImage } from './pages/PDFToImage';
import { ImageToPDF } from './pages/ImageToPDF';
import { EditPages } from './pages/EditPages';
import { Watermark } from './pages/Watermark';
import { ProtectPDF } from './pages/ProtectPDF';
import { SignPDF } from './pages/SignPDF';
import { OCR } from './pages/OCR';
import { BatchProcess } from './pages/BatchProcess';
import {
  Layers,
  Download,
  Sun,
  Moon,
  ArrowUpDown,
  Minimize2,
  Image,
  FileImage,
  RotateCcw,
  Droplets,
  Lock,
  PenTool,
  ScanText,
  ChevronRight,
  FileText,
} from 'lucide-react';

const tools = [
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into one document',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/><path d="M7 16l5 5 5-5M12 12v9"/></svg>,
    color: '#e53e3e',
    bg: 'rgba(229,62,62,0.1)',
    path: '/merge',
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract pages or split PDF into multiple files',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8"><path d="M12 3v18M3 12l4-4m0 0l4-4M3 12l4 4m-4-4h6M21 12l-4-4m0 0l-4-4M21 12l-4 4m4-4h-6"/></svg>,
    color: '#3182ce',
    bg: 'rgba(49,130,206,0.1)',
    path: '/split',
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce file size while keeping quality',
    icon: <Minimize2 className="w-8 h-8" />,
    color: '#38a169',
    bg: 'rgba(56,161,105,0.1)',
    path: '/compress',
  },
  {
    id: 'pdf-to-image',
    title: 'PDF to Image',
    description: 'Convert PDF pages to PNG or JPG images',
    icon: <Image className="w-8 h-8" />,
    color: '#d69e2e',
    bg: 'rgba(214,158,46,0.1)',
    path: '/pdf-to-image',
  },
  {
    id: 'image-to-pdf',
    title: 'Image to PDF',
    description: 'Create PDF from JPG, PNG or other images',
    icon: <FileImage className="w-8 h-8" />,
    color: '#dd6b20',
    bg: 'rgba(221,107,32,0.1)',
    path: '/image-to-pdf',
  },
  {
    id: 'edit-pages',
    title: 'Edit Pages',
    description: 'Rotate, delete, or reorder PDF pages',
    icon: <RotateCcw className="w-8 h-8" />,
    color: '#319795',
    bg: 'rgba(49,151,149,0.1)',
    path: '/edit-pages',
  },
  {
    id: 'watermark',
    title: 'Add Watermark',
    description: 'Add text watermark to your PDF',
    icon: <Droplets className="w-8 h-8" />,
    color: '#805ad5',
    bg: 'rgba(128,90,213,0.1)',
    path: '/watermark',
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    description: 'Add password protection to your PDF',
    icon: <Lock className="w-8 h-8" />,
    color: '#718096',
    bg: 'rgba(113,128,150,0.1)',
    path: '/protect',
  },
  {
    id: 'sign',
    title: 'Sign PDF',
    description: 'Add your signature to PDF documents',
    icon: <PenTool className="w-8 h-8" />,
    color: '#2b6cb0',
    bg: 'rgba(43,108,176,0.1)',
    path: '/sign',
  },
  {
    id: 'ocr',
    title: 'OCR',
    description: 'Extract text from scanned documents',
    icon: <ScanText className="w-8 h-8" />,
    color: '#2c7a7b',
    bg: 'rgba(44,122,123,0.1)',
    path: '/ocr',
  },
  {
    id: 'batch',
    title: 'Batch Process',
    description: 'Process multiple files at once',
    icon: <Layers className="w-8 h-8" />,
    color: '#e53e3e',
    bg: 'rgba(229,62,62,0.1)',
    path: '/batch',
  },
];

function ComingSoon({ title }) {
  return (
    <div className="page-container">
      <div className="coming-soon-box">
        <div className="coming-soon-icon">
          <FileText size={48} />
        </div>
        <h2>{title}</h2>
        <p>This tool is coming soon. Stay tuned!</p>
        <Link to="/" className="btn-primary">← Back to Tools</Link>
      </div>
    </div>
  );
}

function ToolCard({ tool, dark }) {
  const navigate = useNavigate();
  return (
    <div
      className="tool-card"
      onClick={() => navigate(tool.path)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(tool.path)}
    >
      <div className="tool-icon" style={{ background: tool.bg, color: tool.color }}>
        {tool.icon}
      </div>
      <div className="tool-content">
        <h3 className="tool-title">{tool.title}</h3>
        <p className="tool-desc">{tool.description}</p>
      </div>
      <ChevronRight className="tool-arrow" size={16} />
    </div>
  );
}

function Home({ dark }) {
  return (
    <div>
      <div className="hero">
        <h1 className="hero-title">
          All PDF Tools in <span className="hero-accent">One Place</span>
        </h1>
        <p className="hero-sub">
          100% offline. Your files never leave your device. Merge, split, compress, convert and edit PDFs with ease.
        </p>
      </div>
      <div className="tools-grid">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} dark={dark} />
        ))}
      </div>
    </div>
  );
}

function App() {
  const [dark, setDark] = useState(false);

  return (
      <div className={dark ? 'app dark' : 'app'}>
        {/* HEADER */}
        <header className="header">
          <Link to="/" className="logo">
            <div className="logo-icon">
              <FileText size={20} />
            </div>
            <span className="logo-text">PDFPro</span>
          </Link>
          <nav className="header-nav">
            <Link to="/batch" className="nav-link">
              <Layers size={16} /> Batch
            </Link>
            <button className="btn-install">
              <Download size={14} /> Install App
            </button>
            <button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>
        </header>

        {/* MAIN CONTENT */}
        <main className="main">
          <Routes>
            <Route path="/" element={<Home dark={dark} />} />
            <Route path="/split" element={<SplitPDF />} />
            <Route path="/merge" element={<MergePDF />} />
            <Route path="/compress" element={<CompressPDF />} />
            <Route path="/pdf-to-image" element={<PDFToImage />} />
            <Route path="/image-to-pdf" element={<ImageToPDF />} />
            <Route path="/edit-pages" element={<EditPages />} />
            <Route path="/watermark" element={<Watermark />} />
            <Route path="/protect" element={<ProtectPDF />} />
            <Route path="/sign" element={<SignPDF />} />
            <Route path="/ocr" element={<OCR />} />
            <Route path="/batch" element={<BatchProcess />} />
          </Routes>
        </main>
      </div>
  );
}

export default App;
