import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { LandscapeProject, Category, Bucket, BrandingConfig, LegendConfig, CategoryLayoutOverride, LegendLayoutOverride } from '../types';
import { DEFAULT_BRANDING, DEFAULT_LEGEND } from '../types';
import { saveWithPicker } from '../utils/exportUtils';

const STORAGE_KEY = 'iplandscape_project';
const MAX_UNDO_HISTORY = 50;

function createEmptyProject(): LandscapeProject {
  return {
    title: 'Default Project ipLandscape',
    subtitle: '',
    legend: { ...DEFAULT_LEGEND },
    categories: [],
    branding: { ...DEFAULT_BRANDING },
  };
}

function loadFromStorage(): LandscapeProject | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

export function useLandscapeData() {
  const [project, setProject] = useState<LandscapeProject>(
    () => loadFromStorage() || createEmptyProject()
  );

  // Undo history stack
  const undoStack = useRef<LandscapeProject[]>([]);
  const isUndoing = useRef(false);

  const saveToStorage = useCallback((p: LandscapeProject) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, []);

  const pushUndo = useCallback((current: LandscapeProject) => {
    if (isUndoing.current) return;
    undoStack.current = [...undoStack.current.slice(-MAX_UNDO_HISTORY + 1), current];
  }, []);

  const updateProject = useCallback((updater: (prev: LandscapeProject) => LandscapeProject) => {
    setProject(prev => {
      pushUndo(prev);
      const next = updater(prev);
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage, pushUndo]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    isUndoing.current = true;
    const previous = undoStack.current.pop()!;
    setProject(previous);
    saveToStorage(previous);
    isUndoing.current = false;
  }, [saveToStorage]);

  // Listen for Ctrl+Z / Cmd+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const loadProject = useCallback((p: LandscapeProject) => {
    pushUndo(project);
    setProject(p);
    saveToStorage(p);
  }, [saveToStorage, pushUndo, project]);

  const setTitle = useCallback((title: string) => {
    updateProject(p => ({ ...p, title }));
  }, [updateProject]);

  const setSubtitle = useCallback((subtitle: string) => {
    updateProject(p => ({ ...p, subtitle }));
  }, [updateProject]);

  const setLegend = useCallback((legend: LegendConfig) => {
    updateProject(p => ({ ...p, legend }));
  }, [updateProject]);

  const setBranding = useCallback((branding: BrandingConfig) => {
    updateProject(p => ({ ...p, branding }));
  }, [updateProject]);

  const updateBrandingField = useCallback(<K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => {
    updateProject(p => ({
      ...p,
      branding: { ...p.branding, [key]: value },
    }));
  }, [updateProject]);

  const addCategory = useCallback((name: string) => {
    const newCat: Category = { id: uuidv4(), name, buckets: [] };
    updateProject(p => ({ ...p, categories: [...p.categories, newCat], layoutOverrides: undefined }));
  }, [updateProject]);

  const updateCategory = useCallback((categoryId: string, name: string) => {
    updateProject(p => ({
      ...p,
      categories: p.categories.map(c =>
        c.id === categoryId ? { ...c, name } : c
      ),
    }));
  }, [updateProject]);

  const removeCategory = useCallback((categoryId: string) => {
    updateProject(p => ({
      ...p,
      categories: p.categories.filter(c => c.id !== categoryId),
      layoutOverrides: undefined, // clear all overrides so layout recomputes cleanly
    }));
  }, [updateProject]);

  const addBucket = useCallback((categoryId: string, title: string, values: (string | number)[]) => {
    const newBucket: Bucket = { id: uuidv4(), title, values };
    updateProject(p => ({
      ...p,
      layoutOverrides: undefined,
      categories: p.categories.map(c =>
        c.id === categoryId
          ? { ...c, buckets: [...c.buckets, newBucket] }
          : c
      ),
    }));
  }, [updateProject]);

  const updateBucket = useCallback((categoryId: string, bucketId: string, updates: Partial<Bucket>) => {
    updateProject(p => ({
      ...p,
      categories: p.categories.map(c =>
        c.id === categoryId
          ? {
              ...c,
              buckets: c.buckets.map(b =>
                b.id === bucketId ? { ...b, ...updates } : b
              ),
            }
          : c
      ),
    }));
  }, [updateProject]);

  const removeBucket = useCallback((categoryId: string, bucketId: string) => {
    updateProject(p => ({
      ...p,
      categories: p.categories.map(c =>
        c.id === categoryId
          ? { ...c, buckets: c.buckets.filter(b => b.id !== bucketId) }
          : c
      ),
      layoutOverrides: undefined, // clear overrides so layout recomputes cleanly
    }));
  }, [updateProject]);

  const reorderCategories = useCallback((fromIndex: number, toIndex: number) => {
    updateProject(p => {
      const cats = [...p.categories];
      const [moved] = cats.splice(fromIndex, 1);
      cats.splice(toIndex, 0, moved);
      return { ...p, categories: cats };
    });
  }, [updateProject]);

  const clearProject = useCallback(() => {
    pushUndo(project);
    const empty = createEmptyProject();
    setProject(empty);
    saveToStorage(empty);
  }, [saveToStorage, pushUndo, project]);

  const exportProjectJson = useCallback(async () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const filename = `${project.title.replace(/\s+/g, '_')}.iplandscape.json`;
    await saveWithPicker(blob, filename, 'ipLandscape Project', { 'application/json': ['.json'] });
  }, [project]);

  const importProjectJson = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data) as LandscapeProject;
      loadProject(parsed);
    } catch {
      throw new Error('Invalid project file');
    }
  }, [loadProject]);

  const updateLayoutOverride = useCallback((categoryId: string, override: CategoryLayoutOverride) => {
    updateProject(p => ({
      ...p,
      layoutOverrides: {
        ...p.layoutOverrides,
        [categoryId]: override,
      },
    }));
  }, [updateProject]);

  const updateLegendOverride = useCallback((override: LegendLayoutOverride) => {
    updateProject(p => ({
      ...p,
      legendOverride: override,
    }));
  }, [updateProject]);

  const resetLayoutOverrides = useCallback(() => {
    updateProject(p => {
      const { layoutOverrides: _, legendOverride: _lo, ...rest } = p;
      return rest as LandscapeProject;
    });
  }, [updateProject]);

  return {
    project,
    loadProject,
    setTitle,
    setSubtitle,
    setLegend,
    setBranding,
    updateBrandingField,
    addCategory,
    updateCategory,
    removeCategory,
    addBucket,
    updateBucket,
    removeBucket,
    reorderCategories,
    clearProject,
    exportProjectJson,
    importProjectJson,
    updateLayoutOverride,
    updateLegendOverride,
    resetLayoutOverrides,
    undo,
    canUndo: undoStack.current.length > 0,
  };
}
