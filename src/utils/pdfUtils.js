import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

// ====================== PDF UTILS ======================

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

// ====================== IMPROVED WATERMARK ======================
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
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    switch (position) {
      case 'top-left':     x = 40;  y = height - 60; break;
      case 'top-center':   x = (width - textWidth) / 2; y = height - 60; break;
      case 'top-right':    x = width - textWidth - 40; y = height - 60; break;
      case 'middle-left':  x = 40;  y = height / 2; break;
      case 'center':       x = (width - textWidth) / 2; y = height / 2; break;
      case 'middle-right': x = width - textWidth - 40; y = height / 2; break;
      case 'bottom-left':  x = 40;  y = 60; break;
      case 'bottom-center':x = (width - textWidth) / 2; y = 60; break;
      case 'bottom-right': x = width - textWidth - 40; y = 60; break;
      default:             x = (width - textWidth) / 2; y = height / 2;
    }

    // Main watermark
    page.drawText(text.toUpperCase(), {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(rotation),
    });

    // Mosaic effect
    if (mosaic) {
      const offset = fontSize * 1.8;
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

// ====================== IMPROVED SIGN PDF ======================
export const signPDF = async (file, signatureDataUrl, options = {}) => {
  const {
    width = 320,
    height = 100,
    pageIndex = 0,
  } = options;

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Embed signature image
  const response = await fetch(signatureDataUrl);
  const signatureBytes = await response.arrayBuffer();
  const signatureImage = await pdfDoc.embedPng(signatureBytes);

  const pages = pdfDoc.getPages();
  const targetPage = pages[Math.min(pageIndex, pages.length - 1)];
  const { width: pageWidth, height: pageHeight } = targetPage.getSize();

  // Center signature horizontally at the bottom
  const finalX = (pageWidth - width) / 2;
  const finalY = 80;   // Distance from bottom

  targetPage.drawImage(signatureImage, {
    x: finalX,
    y: finalY,
    width,
    height,
  });

  return await pdfDoc.save();
};

// ====================== OTHER FUNCTIONS ======================
export const protectPDF = async (file, userPassword) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
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

export const reorderPages = async (file, newOrder) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdfDoc, newOrder);
  copiedPages.forEach((page) => newPdf.addPage(page));
  return await newPdf.save();
};

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
