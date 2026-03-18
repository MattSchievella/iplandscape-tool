import { useCallback, useState } from 'react';
import { parseExcelFile } from '../utils/excelParser';
import type { LandscapeProject } from '../types';

interface ExcelUploaderProps {
  onProjectLoaded: (project: LandscapeProject) => void;
}

export function ExcelUploader({ onProjectLoaded }: ExcelUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleFile = useCallback(async (file: File) => {
    setErrors([]);
    setWarnings([]);

    if (!file.name.match(/\.xlsx?$/i)) {
      setErrors(['Please upload an Excel file (.xlsx or .xls)']);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelFile(buffer);

      if (result.errors.length > 0) {
        setErrors(result.errors);
        return;
      }
      if (result.warnings.length > 0) {
        setWarnings(result.warnings);
      }

      onProjectLoaded(result.project);
    } catch (err) {
      setErrors([`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    }
  }, [onProjectLoaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  return (
    <div>
      <div
        className="border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer"
        style={{
          borderColor: dragOver ? 'var(--accent-cyan)' : 'var(--border-subtle)',
          backgroundColor: dragOver ? 'var(--accent-glow)' : 'var(--bg-card)',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('excel-input')?.click()}
      >
        <div className="text-4xl mb-3 opacity-60">📊</div>
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Drop Excel file here or click to browse
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Supports .xlsx and .xls files
        </p>
        <input
          id="excel-input"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {errors.length > 0 && (
        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {errors.map((err, i) => (
            <p key={i} className="text-sm" style={{ color: '#f87171' }}>{err}</p>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
          {warnings.map((warn, i) => (
            <p key={i} className="text-sm" style={{ color: '#fbbf24' }}>{warn}</p>
          ))}
        </div>
      )}
    </div>
  );
}
