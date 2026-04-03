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
export const addWatermark = async (file, { text, opacity = 0.3, fontSize = 48, color = { r: 0.5, g: 0.5, b: 0.5 } }) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(45),
    });
  });
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
export const signPDF = async (file, signatureDataUrl, { x = 50, y = 50, width = 200, height = 80, pageIndex = 0 } = {}) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
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
