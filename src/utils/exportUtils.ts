import { toPng, toJpeg, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';

export async function saveWithPicker(blob: Blob, filename: string, description: string, accept: Record<string, string[]>): Promise<void> {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description, accept }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e: any) {
      if (e.name === 'AbortError') return; // user cancelled
    }
  }
  // Fallback for browsers without File System Access API
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function exportToPng(element: HTMLElement, filename = 'iplandscape.png'): Promise<void> {
  const dataUrl = await toPng(element, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: undefined,
  });
  const blob = await dataUrlToBlob(dataUrl);
  await saveWithPicker(blob, filename, 'PNG Image', { 'image/png': ['.png'] });
}

export async function exportToJpeg(element: HTMLElement, filename = 'iplandscape.jpg'): Promise<void> {
  const dataUrl = await toJpeg(element, {
    quality: 0.95,
    pixelRatio: 2,
  });
  const blob = await dataUrlToBlob(dataUrl);
  await saveWithPicker(blob, filename, 'JPEG Image', { 'image/jpeg': ['.jpg', '.jpeg'] });
}

export async function exportToSvg(element: HTMLElement, filename = 'iplandscape.svg'): Promise<void> {
  const dataUrl = await toSvg(element, {
    quality: 1,
  });
  const blob = await dataUrlToBlob(dataUrl);
  await saveWithPicker(blob, filename, 'SVG Image', { 'image/svg+xml': ['.svg'] });
}

export async function exportToPdf(element: HTMLElement, filename = 'iplandscape.pdf'): Promise<void> {
  const dataUrl = await toPng(element, {
    quality: 1,
    pixelRatio: 2,
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
  });

  const aspectRatio = img.width / img.height;
  const pdfWidth = 297; // A4 landscape width in mm
  const pdfHeight = pdfWidth / aspectRatio;

  const pdf = new jsPDF({
    orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
  const pdfBlob = pdf.output('blob');
  await saveWithPicker(pdfBlob, filename, 'PDF Document', { 'application/pdf': ['.pdf'] });
}
