import { useState } from 'react';
import type { BrandingConfig, LegendConfig } from '../types';
import { extractColorsFromUrl, mapColorsToBranding } from '../utils/colorExtractor';

interface BrandingPanelProps {
  branding: BrandingConfig;
  legend: LegendConfig;
  onUpdateBranding: <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => void;
  onSetLegend: (legend: LegendConfig) => void;
  onClose: () => void;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className="flex items-center gap-3 mb-3 rounded-lg transition-all"
      style={{
        padding: 4,
        margin: -4,
        outline: dragOver ? '2px solid var(--accent-cyan)' : '2px solid transparent',
        background: dragOver ? 'rgba(0, 200, 255, 0.08)' : 'transparent',
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const color = e.dataTransfer.getData('text/plain');
        if (color) onChange(color);
      }}
    >
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg cursor-pointer border-0"
        style={{ background: 'transparent' }}
      />
      <div className="flex-1">
        <label className="block text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg px-2 py-1 text-xs font-mono"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  );
}

const FONT_OPTIONS = [
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Georgia, serif',
  'Verdana, sans-serif',
  'Trebuchet MS, sans-serif',
  'Impact, sans-serif',
  'Courier New, monospace',
  'Roboto, sans-serif',
  'Open Sans, sans-serif',
  'Montserrat, sans-serif',
];

function WebsiteColorExtractor({ onApply }: { onApply: (colors: string[]) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  const handleExtract = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setExtractedColors([]);
    try {
      const colors = await extractColorsFromUrl(url);
      setExtractedColors(colors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract colors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-cyan)' }}>Extract from Website</h3>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={url}
          onChange={e => { setUrl(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleExtract(); }}
          placeholder="https://example.com"
          className="flex-1 rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        />
        <button
          onClick={handleExtract}
          disabled={loading || !url.trim()}
          className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
          style={{
            background: loading ? 'rgba(255,255,255,0.05)' : 'var(--accent-cyan)',
            color: loading ? 'var(--text-muted)' : '#000',
            opacity: !url.trim() ? 0.4 : 1,
          }}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Scanning…
            </span>
          ) : 'Extract'}
        </button>
      </div>

      {error && (
        <p className="text-xs mt-1 mb-2" style={{ color: '#f87171' }}>{error}</p>
      )}

      {extractedColors.length > 0 && (
        <div className="mt-3">
          <div className="flex gap-1.5 mb-3">
            {extractedColors.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('text/plain', color);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="w-10 h-10 rounded-lg active:opacity-50"
                  style={{
                    backgroundColor: color,
                    border: '2px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    cursor: 'grab',
                  }}
                  title={`${color} — drag to a color field below`}
                />
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {color}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Drag a swatch to a color field, or apply all at once</p>
          <div className="flex gap-2">
            <button
              onClick={() => onApply(extractedColors)}
              className="rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
              style={{ background: 'var(--accent-cyan)', color: '#000' }}
            >
              Apply Palette
            </button>
            <button
              onClick={() => { setExtractedColors([]); setUrl(''); }}
              className="rounded-lg px-3 py-1.5 text-xs cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BrandingPanel({ branding, legend, onUpdateBranding, onSetLegend, onClose }: BrandingPanelProps) {
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateBranding('logo', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateBranding('backgroundImage', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="side-panel w-80 p-5 overflow-y-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Branding</h2>
        <button onClick={onClose} className="text-xl cursor-pointer" style={{ color: 'var(--text-muted)' }}>&times;</button>
      </div>

      {/* Extract from Website */}
      <WebsiteColorExtractor onApply={(colors) => {
        const mapped = mapColorsToBranding(colors);
        for (const [key, value] of Object.entries(mapped)) {
          onUpdateBranding(key as keyof BrandingConfig, value);
        }
      }} />

      {/* Colors */}
      <div className="pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-cyan)' }}>Colors</h3>
        <ColorField label="Primary (Category Headers)" value={branding.primaryColor} onChange={v => onUpdateBranding('primaryColor', v)} />
        <ColorField label="Secondary (Bucket Cards)" value={branding.secondaryColor} onChange={v => onUpdateBranding('secondaryColor', v)} />
        <ColorField label="Accent (Title Text)" value={branding.accentColor} onChange={v => onUpdateBranding('accentColor', v)} />
        <ColorField label="Project Title" value={branding.titleColor || branding.textColor} onChange={v => onUpdateBranding('titleColor', v)} />
        <ColorField label="Text Color" value={branding.textColor} onChange={v => onUpdateBranding('textColor', v)} />
        <ColorField label="Value Color (XX:YY)" value={branding.valueColor || branding.textColor} onChange={v => onUpdateBranding('valueColor', v)} />
        <ColorField label="Background" value={branding.backgroundColor} onChange={v => onUpdateBranding('backgroundColor', v)} />
      </div>

      {/* Font */}
      <div className="pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-cyan)' }}>Font</h3>
        <select
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          value={branding.fontFamily}
          onChange={e => onUpdateBranding('fontFamily', e.target.value)}
        >
          {FONT_OPTIONS.map(font => (
            <option key={font} value={font} style={{ fontFamily: font, background: '#0a1628' }}>
              {font.split(',')[0]}
            </option>
          ))}
        </select>
      </div>

      {/* Logo */}
      <div className="pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-cyan)' }}>Logo</h3>
        {branding.logo && (
          <>
            <div className="mb-3 relative p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <img src={branding.logo} alt="Logo" className="h-12 object-contain" />
              <button
                onClick={() => onUpdateBranding('logo', undefined)}
                className="absolute top-2 right-2 text-xs cursor-pointer"
                style={{ color: '#f87171' }}
              >
                Remove
              </button>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Size: {branding.logoScale ?? 100}%
              </label>
              <input
                type="range"
                min={20}
                max={150}
                value={branding.logoScale ?? 100}
                onChange={e => onUpdateBranding('logoScale', Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Y Position: {branding.logoOffsetY ?? 0}px
              </label>
              <input
                type="range"
                min={-50}
                max={50}
                value={branding.logoOffsetY ?? 0}
                onChange={e => onUpdateBranding('logoOffsetY', Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
            </div>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        />
      </div>

      {/* Background Image */}
      <div className="pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-cyan)' }}>Background Image</h3>
        {branding.backgroundImage && (
          <div className="mb-3 relative">
            <img src={branding.backgroundImage} alt="Background" className="h-16 w-full object-cover rounded-xl" />
            <button
              onClick={() => onUpdateBranding('backgroundImage', undefined)}
              className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded cursor-pointer"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#f87171' }}
            >
              Remove
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleBackgroundUpload}
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        />
      </div>

      {/* Legend Config */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-cyan)' }}>Legend</h3>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Format:</label>
          <select
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            value={legend.format}
            onChange={e => {
              const fmt = e.target.value as '2-value' | '3-value';
              const labels = fmt === '3-value'
                ? [...legend.labels.slice(0, 2), legend.labels[2] || 'Inactive']
                : legend.labels.slice(0, 2);
              onSetLegend({ format: fmt, labels });
            }}
          >
            <option value="2-value" style={{ background: '#0a1628' }}>XX : YY</option>
            <option value="3-value" style={{ background: '#0a1628' }}>XX : YY : ZZ</option>
          </select>
        </div>
        {legend.labels.map((label, i) => (
          <div key={i} className="mb-2">
            <input
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              value={label}
              placeholder={`Label ${i + 1}`}
              onChange={e => {
                const updated = [...legend.labels];
                updated[i] = e.target.value;
                onSetLegend({ ...legend, labels: updated });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
