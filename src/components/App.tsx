import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useLandscapeData } from '../hooks/useLandscapeData';
import { LandscapeCanvas } from './LandscapeCanvas';
import { ExcelUploader } from './ExcelUploader';
import { EditPanel } from './EditPanel';
import { BrandingPanel } from './BrandingPanel';
import { exportToPng, exportToSvg, exportToPdf, saveWithPicker } from '../utils/exportUtils';
import { generateTemplateWorkbook } from '../utils/excelParser';
import { DEFAULT_STYLIZE_PROMPT, ENV_GEMINI_API_KEY, captureCanvasAsBase64, stylizeImage } from '../utils/stylizeApi';

type SidePanel = 'none' | 'edit' | 'branding';

export default function App() {
  const {
    project,
    loadProject,
    setTitle,
    setSubtitle,
    setLegend,
    updateBrandingField,
    addCategory,
    updateCategory,
    removeCategory,
    addBucket,
    updateBucket,
    removeBucket,
    clearProject,
    exportProjectJson,
    importProjectJson,
  } = useLandscapeData();

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [editingBucket, setEditingBucket] = useState<{ categoryId: string; bucketId: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(project.categories.length === 0);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [stylizePanelOpen, setStylizePanelOpen] = useState(false);
  const [stylizePrompt, setStylizePrompt] = useState(DEFAULT_STYLIZE_PROMPT);
  const [stylizeApiKey, setStylizeApiKey] = useState(() => ENV_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '');
  const [stylizeLoading, setStylizeLoading] = useState(false);
  const [stylizedImageUrl, setStylizedImageUrl] = useState<string | null>(null);

  const handleEditBucket = useCallback((categoryId: string, bucketId: string) => {
    setEditingBucket({ categoryId, bucketId });
    setEditingCategory(null);
    setSidePanel('edit');
  }, []);

  const handleEditCategory = useCallback((categoryId: string) => {
    setEditingCategory(categoryId);
    setEditingBucket(null);
    setSidePanel('edit');
  }, []);

  const closeSidePanel = () => {
    setSidePanel('none');
    setEditingBucket(null);
    setEditingCategory(null);
  };

  const handleExport = async (format: 'png' | 'jpeg' | 'svg' | 'pdf') => {
    if (!canvasRef.current) return;
    setExportMenuOpen(false);
    const filename = project.title.replace(/\s+/g, '_').toLowerCase();
    if (format === 'png') await exportToPng(canvasRef.current, `${filename}.png`);
    if (format === 'jpeg') await (await import('../utils/exportUtils')).exportToJpeg(canvasRef.current, `${filename}.jpg`);
    if (format === 'svg') await exportToSvg(canvasRef.current, `${filename}.svg`);
    if (format === 'pdf') await exportToPdf(canvasRef.current, `${filename}.pdf`);
  };

  const downloadTemplate = () => {
    const wb = generateTemplateWorkbook();
    XLSX.writeFile(wb, 'iplandscape_template.xlsx');
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        importProjectJson(text);
        setShowUploader(false);
      } catch {
        alert('Invalid project file');
      }
    };
    input.click();
  };

  const handleStylize = async () => {
    if (!canvasRef.current || !stylizeApiKey.trim()) return;
    localStorage.setItem('gemini_api_key', stylizeApiKey.trim());
    setStylizeLoading(true);
    setStylizePanelOpen(false);
    try {
      const base64 = await captureCanvasAsBase64(canvasRef.current);
      const result = await stylizeImage(base64, stylizePrompt, stylizeApiKey.trim());
      setStylizedImageUrl(result.imageDataUrl);
    } catch (err) {
      alert(`Stylize failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setStylizeLoading(false);
    }
  };

  const handleDownloadStylized = async () => {
    if (!stylizedImageUrl) return;
    const res = await fetch(stylizedImageUrl);
    const blob = await res.blob();
    const filename = project.title.replace(/\s+/g, '_').toLowerCase() + '_stylized.png';
    await saveWithPicker(blob, filename, 'PNG Image', { 'image/png': ['.png'] });
  };

  const hasData = project.categories.length > 0;

  // Scale-to-fit: watch container size and compute scale factor
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const s = Math.min(width / 1920, height / 1080);
        setScale(Math.min(s, 1)); // Never scale above 1
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <header
        className="px-5 py-3 flex items-center gap-3 shrink-0"
        style={{
          backgroundColor: 'rgba(5, 14, 26, 0.85)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(12px)',
          position: 'relative',
          zIndex: 100,
        }}
      >
        {/* Logo / App name */}
        <div className="flex items-center gap-2 mr-5">
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            <span style={{ color: 'var(--accent-cyan)' }}>ip</span>Landscape Tool
          </span>
        </div>

        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              try {
                const buffer = await file.arrayBuffer();
                const result = (await import('../utils/excelParser')).parseExcelFile(buffer);
                if (result.errors.length > 0) {
                  alert(result.errors.join('\n'));
                  return;
                }
                loadProject(result.project);
                setShowUploader(false);
              } catch (err) {
                alert(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
              }
            };
            input.click();
          }}
          className="btn-accent px-4 py-2 text-sm rounded-full"
        >
          Upload Excel
        </button>

        <button
          onClick={downloadTemplate}
          className="btn-ghost px-4 py-2 text-sm rounded-full"
        >
          Download Template
        </button>

        <div className="h-5 mx-1" style={{ borderLeft: '1px solid var(--border-subtle)' }} />

        <button
          onClick={() => { setSidePanel(sidePanel === 'edit' ? 'none' : 'edit'); }}
          className={`px-4 py-2 text-sm rounded-full ${sidePanel === 'edit' ? 'btn-ghost-active' : 'btn-ghost'}`}
        >
          Edit Data
        </button>

        <button
          onClick={() => { setSidePanel(sidePanel === 'branding' ? 'none' : 'branding'); }}
          className={`px-4 py-2 text-sm rounded-full ${sidePanel === 'branding' ? 'btn-ghost-active' : 'btn-ghost'}`}
        >
          Branding
        </button>

        <div className="h-5 mx-1" style={{ borderLeft: '1px solid var(--border-subtle)' }} />

        {/* Export dropdown */}
        <div className="relative" style={{ zIndex: 50 }}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            disabled={!hasData}
            className="btn-accent px-4 py-2 text-sm rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export
          </button>
          {exportMenuOpen && (
            <div
              className="absolute top-full right-0 mt-2 rounded-xl z-50 overflow-hidden min-w-[160px]"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <button onClick={() => handleExport('png')} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-white/5" style={{ color: 'var(--text-primary)' }}>Export PNG</button>
              <button onClick={() => handleExport('jpeg')} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-white/5" style={{ color: 'var(--text-primary)' }}>Export JPEG</button>
              <button onClick={() => handleExport('svg')} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-white/5" style={{ color: 'var(--text-primary)' }}>Export SVG</button>
              <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-white/5" style={{ color: 'var(--text-primary)' }}>Export PDF</button>
            </div>
          )}
        </div>

        <div className="h-5 mx-1" style={{ borderLeft: '1px solid var(--border-subtle)' }} />

        <button
          onClick={exportProjectJson}
          disabled={!hasData}
          className="btn-ghost px-4 py-2 text-sm rounded-full disabled:opacity-40"
        >
          Save Project
        </button>

        <button
          onClick={handleImportJson}
          className="btn-ghost px-4 py-2 text-sm rounded-full"
        >
          Load Project
        </button>

        <div className="ml-auto" />

        {/* Stylize Now button */}
        <div className="relative" style={{ zIndex: 50 }}>
          <button
            onClick={() => setStylizePanelOpen(!stylizePanelOpen)}
            disabled={!hasData || stylizeLoading}
            className="px-5 py-2 text-sm rounded-full font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: stylizeLoading
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              color: '#fff',
              border: 'none',
              cursor: stylizeLoading ? 'wait' : 'pointer',
              boxShadow: '0 2px 12px rgba(139, 92, 246, 0.4)',
            }}
          >
            {stylizeLoading ? 'Stylizing...' : 'Stylize Now'}
          </button>

          {stylizePanelOpen && (
            <div
              className="absolute top-full right-0 mt-2 rounded-xl z-50 overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                width: 380,
                padding: 16,
              }}
            >
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Gemini API Key
              </label>
              <input
                type="password"
                value={stylizeApiKey}
                onChange={(e) => setStylizeApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-3 py-2 rounded-lg text-sm mb-3"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />

              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Stylize Prompt
              </label>
              <textarea
                value={stylizePrompt}
                onChange={(e) => setStylizePrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg text-sm mb-3 resize-none"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />

              <button
                onClick={handleStylize}
                disabled={!stylizeApiKey.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Run Stylization
              </button>
            </div>
          )}
        </div>

        <div className="h-5 mx-1" style={{ borderLeft: '1px solid var(--border-subtle)' }} />

        {hasData && (
          <button
            onClick={() => { if (confirm('Clear all data?')) { clearProject(); setShowUploader(true); } }}
            className="px-4 py-2 text-sm rounded-full"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div
          ref={canvasContainerRef}
          className="flex-1 overflow-hidden grid-pattern"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16 }}
        >
          {showUploader && (
            <div className="max-w-xl w-full mb-4" style={{ zIndex: 10 }}>
              <ExcelUploader
                onProjectLoaded={(p) => {
                  loadProject(p);
                  setShowUploader(false);
                }}
              />
              {hasData && (
                <button
                  onClick={() => setShowUploader(false)}
                  className="mt-3 text-sm cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel - go back to chart
                </button>
              )}
            </div>
          )}

          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              flexShrink: 0,
            }}
          >
            <LandscapeCanvas
              ref={canvasRef}
              project={project}
              onEditBucket={handleEditBucket}
              onEditCategory={handleEditCategory}
            />
          </div>
        </div>

        {/* Side panels */}
        {sidePanel === 'edit' && (
          <EditPanel
            project={project}
            editingBucket={editingBucket}
            editingCategory={editingCategory}
            onUpdateBucket={updateBucket}
            onRemoveBucket={(cid, bid) => { removeBucket(cid, bid); setEditingBucket(null); }}
            onUpdateCategory={updateCategory}
            onRemoveCategory={(cid) => { removeCategory(cid); setEditingCategory(null); }}
            onAddBucket={addBucket}
            onAddCategory={addCategory}
            onClose={closeSidePanel}
            onSetTitle={setTitle}
            onSetSubtitle={setSubtitle}
          />
        )}

        {sidePanel === 'branding' && (
          <BrandingPanel
            branding={project.branding}
            legend={project.legend}
            onUpdateBranding={updateBrandingField}
            onSetLegend={setLegend}
            onClose={closeSidePanel}
          />
        )}
      </div>

      {/* Stylized image result modal */}
      {stylizedImageUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
          onClick={() => setStylizedImageUrl(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              gap: 24,
              maxWidth: '95vw',
              maxHeight: '90vh',
            }}
          >
            {/* Image */}
            <img
              src={stylizedImageUrl}
              alt="Stylized landscape"
              style={{
                maxHeight: '85vh',
                maxWidth: '60vw',
                objectFit: 'contain',
                borderRadius: 12,
                boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
              }}
            />

            {/* Edit panel */}
            <div
              style={{
                width: 340,
                flexShrink: 0,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Adjust & Re-stylize
              </span>

              <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Prompt
              </label>
              <textarea
                value={stylizePrompt}
                onChange={(e) => setStylizePrompt(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />

              <button
                onClick={handleStylize}
                disabled={stylizeLoading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  color: '#fff',
                  border: 'none',
                  cursor: stylizeLoading ? 'wait' : 'pointer',
                }}
              >
                {stylizeLoading ? 'Stylizing...' : 'Re-stylize'}
              </button>

              <div style={{ flex: 1 }} />

              <button
                onClick={handleDownloadStylized}
                className="w-full py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Download Image
              </button>
              <button
                onClick={() => setStylizedImageUrl(null)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
