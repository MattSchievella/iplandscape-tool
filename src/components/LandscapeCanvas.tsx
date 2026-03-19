import React, { forwardRef, useMemo, useState, useEffect, useCallback } from 'react';
import type { LandscapeProject, CategoryLayoutOverride } from '../types';
import { CategoryBlock } from './CategoryBlock';
import { computeLayout } from '../utils/layoutEngine';

const PADDING = 24;

interface LandscapeCanvasProps {
  project: LandscapeProject;
  canvasScale: number;
  onEditBucket: (categoryId: string, bucketId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onUpdateLayoutOverride: (categoryId: string, override: CategoryLayoutOverride) => void;
}

interface DragState {
  categoryId: string;
  startPointerX: number;
  startPointerY: number;
  origX: number;
  origY: number;
}

interface ResizeState {
  categoryId: string;
  startPointerX: number;
  startPointerY: number;
  origScale: number;
  baseWidth: number;
  baseHeight: number;
}

export const LandscapeCanvas = forwardRef<HTMLDivElement, LandscapeCanvasProps>(
  function LandscapeCanvas({ project, canvasScale, onEditBucket, onEditCategory, onUpdateLayoutOverride }, ref) {
    const { branding, legend, categories } = project;

    const layout = useMemo(() => computeLayout(project), [project]);

    // Apply user font-size adjustments (clamped to MIN_FONT=7)
    const adjustedTitleFont = Math.max(7, layout.titleFontSize + (branding.titleFontAdjust ?? 0));
    const adjustedValueFont = Math.max(7, layout.valueFontSize + (branding.valueFontAdjust ?? 0));

    // Temp overrides during drag/resize (local state for performance)
    const [tempOverrides, setTempOverrides] = useState<Record<string, { x: number; y: number; scale: number }>>({});
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [resizeState, setResizeState] = useState<ResizeState | null>(null);

    // Compute effective layout: base layout + persisted overrides + temp overrides
    const getEffective = useCallback((catId: string, baseX: number, baseY: number) => {
      const persisted = project.layoutOverrides?.[catId];
      const temp = tempOverrides[catId];
      return {
        x: temp?.x ?? persisted?.x ?? baseX,
        y: temp?.y ?? persisted?.y ?? baseY,
        scale: temp?.scale ?? persisted?.scale ?? 1,
      };
    }, [project.layoutOverrides, tempOverrides]);

    // --- DRAG HANDLERS ---
    const handleMoveStart = useCallback((categoryId: string, e: React.PointerEvent) => {
      const catLayout = layout.categories.find(c => c.categoryId === categoryId);
      if (!catLayout) return;
      const eff = getEffective(categoryId, catLayout.x, catLayout.y);
      setDragState({
        categoryId,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        origX: eff.x,
        origY: eff.y,
      });
    }, [layout.categories, getEffective]);

    useEffect(() => {
      if (!dragState) return;

      const handleMove = (e: PointerEvent) => {
        const dx = (e.clientX - dragState.startPointerX) / canvasScale;
        const dy = (e.clientY - dragState.startPointerY) / canvasScale;
        const newX = dragState.origX + dx;
        const newY = dragState.origY + dy;
        const persisted = project.layoutOverrides?.[dragState.categoryId];
        setTempOverrides(prev => ({
          ...prev,
          [dragState.categoryId]: {
            x: newX,
            y: newY,
            scale: persisted?.scale ?? 1,
          },
        }));
      };

      const handleUp = (e: PointerEvent) => {
        const dx = (e.clientX - dragState.startPointerX) / canvasScale;
        const dy = (e.clientY - dragState.startPointerY) / canvasScale;
        const newX = dragState.origX + dx;
        const newY = dragState.origY + dy;
        const persisted = project.layoutOverrides?.[dragState.categoryId];
        onUpdateLayoutOverride(dragState.categoryId, {
          x: newX,
          y: newY,
          scale: persisted?.scale ?? 1,
        });
        setTempOverrides(prev => {
          const next = { ...prev };
          delete next[dragState.categoryId];
          return next;
        });
        setDragState(null);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
      return () => {
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };
    }, [dragState, canvasScale, project.layoutOverrides, onUpdateLayoutOverride]);

    // --- RESIZE HANDLERS ---
    const handleResizeStart = useCallback((categoryId: string, e: React.PointerEvent) => {
      const catLayout = layout.categories.find(c => c.categoryId === categoryId);
      if (!catLayout) return;
      const persisted = project.layoutOverrides?.[categoryId];
      setResizeState({
        categoryId,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        origScale: persisted?.scale ?? 1,
        baseWidth: catLayout.width,
        baseHeight: catLayout.height,
      });
    }, [layout.categories, project.layoutOverrides]);

    useEffect(() => {
      if (!resizeState) return;

      const handleMove = (e: PointerEvent) => {
        const dx = (e.clientX - resizeState.startPointerX) / canvasScale;
        const dy = (e.clientY - resizeState.startPointerY) / canvasScale;
        // Use diagonal distance for natural feel
        const diag = Math.sqrt(resizeState.baseWidth ** 2 + resizeState.baseHeight ** 2);
        const delta = (dx + dy) / diag;
        const newScale = Math.max(0.4, Math.min(2.5, resizeState.origScale + delta));
        const persisted = project.layoutOverrides?.[resizeState.categoryId];
        setTempOverrides(prev => ({
          ...prev,
          [resizeState.categoryId]: {
            x: persisted?.x ?? layout.categories.find(c => c.categoryId === resizeState.categoryId)!.x,
            y: persisted?.y ?? layout.categories.find(c => c.categoryId === resizeState.categoryId)!.y,
            scale: newScale,
          },
        }));
      };

      const handleUp = (e: PointerEvent) => {
        const dx = (e.clientX - resizeState.startPointerX) / canvasScale;
        const dy = (e.clientY - resizeState.startPointerY) / canvasScale;
        const diag = Math.sqrt(resizeState.baseWidth ** 2 + resizeState.baseHeight ** 2);
        const delta = (dx + dy) / diag;
        const newScale = Math.max(0.4, Math.min(2.5, resizeState.origScale + delta));
        const persisted = project.layoutOverrides?.[resizeState.categoryId];
        const catLayout = layout.categories.find(c => c.categoryId === resizeState.categoryId)!;
        onUpdateLayoutOverride(resizeState.categoryId, {
          x: persisted?.x ?? catLayout.x,
          y: persisted?.y ?? catLayout.y,
          scale: newScale,
        });
        setTempOverrides(prev => {
          const next = { ...prev };
          delete next[resizeState.categoryId];
          return next;
        });
        setResizeState(null);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
      return () => {
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };
    }, [resizeState, canvasScale, layout.categories, project.layoutOverrides, onUpdateLayoutOverride]);

    return (
      <div
        ref={ref}
        style={{
          width: layout.canvasWidth,
          height: layout.canvasHeight,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: branding.backgroundColor,
          backgroundImage: branding.backgroundImage ? `url(${branding.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: branding.fontFamily,
          color: branding.textColor,
          borderRadius: 8,
        }}
      >
        {/* Header with logo and title */}
        <div
          style={{
            position: 'absolute',
            left: layout.header.x,
            top: layout.header.y,
            width: layout.header.width,
            height: layout.header.height,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {branding.logo && (
            <img
              src={branding.logo}
              alt="Logo"
              style={{
                height: (layout.header.height - 10) * (branding.logoScale ?? 100) / 100,
                width: 'auto',
                objectFit: 'contain',
                position: 'relative',
                marginLeft: branding.logoOffsetX ?? 0,
                marginRight: 20,
                top: branding.logoOffsetY ?? 0,
              }}
            />
          )}
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                margin: 0,
                lineHeight: 1.2,
                color: branding.titleColor || branding.textColor,
              }}
            >
              {project.title.split(/(ipLandscape)/i).map((part, i) =>
                /ipLandscape/i.test(part)
                  ? <span key={i}>{part}<sup style={{ fontSize: '0.5em', verticalAlign: 'super' }}>™</sup></span>
                  : part
              )}
            </h1>
            {project.subtitle && (
              <p style={{ fontSize: 14, opacity: 0.8, margin: '2px 0 0 0' }}>{project.subtitle}</p>
            )}
          </div>
        </div>

        {/* Categories - absolutely positioned */}
        {categories.length === 0 ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              opacity: 0.5,
            }}
          >
            Upload an Excel file or add categories to get started
          </div>
        ) : (
          layout.categories.map(catLayout => {
            const category = categories.find(c => c.id === catLayout.categoryId);
            if (!category) return null;
            const eff = getEffective(catLayout.categoryId, catLayout.x, catLayout.y);
            const effectiveLayout = { ...catLayout, x: eff.x, y: eff.y };
            return (
              <CategoryBlock
                key={category.id}
                category={category}
                legend={legend}
                branding={branding}
                layout={effectiveLayout}
                titleFontSize={adjustedTitleFont}
                valueFontSize={adjustedValueFont}
                scale={eff.scale}
                onEditBucket={onEditBucket}
                onEditCategory={onEditCategory}
                onMoveStart={handleMoveStart}
                onResizeStart={handleResizeStart}
              />
            );
          })
        )}

        {/* Legend - fixed bottom right */}
        <div
          style={{
            position: 'absolute',
            right: PADDING,
            bottom: PADDING,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: `${branding.primaryColor}cc`,
              padding: '8px 24px',
              borderRadius: 7,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: branding.accentColor,
              }}
            >
              LEGEND
            </span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>
              {legend.labels.map((label, i) => (
                <span key={i}>
                  {i > 0 && ' : '}
                  {label}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    );
  }
);
