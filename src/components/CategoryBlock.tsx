import React from 'react';
import type { Category, LegendConfig, BrandingConfig, CategoryLayout } from '../types';
import { BucketCard } from './BucketCard';
import { TechPattern } from './TechPattern';

interface CategoryBlockProps {
  category: Category;
  legend: LegendConfig;
  branding: BrandingConfig;
  layout: CategoryLayout;
  titleFontSize: number;
  valueFontSize: number;
  scale: number;
  onEditBucket: (categoryId: string, bucketId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onMoveStart: (categoryId: string, e: React.PointerEvent) => void;
  onResizeStart: (categoryId: string, e: React.PointerEvent) => void;
}

export function CategoryBlock({
  category,
  legend,
  branding,
  layout,
  titleFontSize,
  valueFontSize,
  scale,
  onEditBucket,
  onEditCategory,
  onMoveStart,
  onResizeStart,
}: CategoryBlockProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: layout.x,
        top: layout.y,
        width: layout.width * scale,
        height: layout.height * scale,
        border: 'none',
        borderRadius: 6,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Inner wrapper — scales content uniformly */}
      <div
        style={{
          width: layout.width,
          height: layout.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
        }}
      >
        {/* Category background layer — independent opacity */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: branding.primaryColor,
            opacity: (branding.categoryOpacity ?? 100) / 100,
            borderRadius: 6,
            pointerEvents: 'none',
          }}
        />

        {/* Category header - centered between card top and first bucket */}
        <div
          className="hover:brightness-110 transition-all"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: layout.headerHeight + 16,
            color: branding.accentColor,
            fontFamily: branding.fontFamily,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 8px',
            zIndex: 1,
            cursor: 'grab',
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            onMoveStart(category.id, e);
          }}
          onDoubleClick={() => onEditCategory(category.id)}
          title="Drag to move · Double-click to edit"
        >
          <h3
            style={{
              fontSize: Math.min(21, (titleFontSize + 2) * 2 - 5),
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textAlign: 'center',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {category.name}
          </h3>
        </div>

        {/* Buckets - absolutely positioned within category */}
        <div style={{ position: 'absolute', top: layout.headerHeight, left: 0, right: 0, bottom: 0 }}>
          {category.buckets.map((bucket, i) => {
            const bl = layout.buckets[i];
            if (!bl) return null;
            return (
              <div
                key={bucket.id}
                style={{
                  position: 'absolute',
                  left: bl.x,
                  top: bl.y,
                  width: bl.width,
                  height: bl.height,
                }}
              >
                <BucketCard
                  bucket={bucket}
                  legend={legend}
                  branding={branding}
                  width={bl.width}
                  height={bl.height}
                  titleFontSize={titleFontSize}
                  valueFontSize={valueFontSize}
                  onClick={() => onEditBucket(category.id, bucket.id)}
                />
              </div>
            );
          })}

          {/* Fill empty grid slots with tech pattern */}
          {(() => {
            const totalSlots = layout.bucketGridCols * layout.bucketGridRows;
            const emptySlots = totalSlots - category.buckets.length;
            if (emptySlots <= 0 || layout.buckets.length === 0) return null;
            const lastBucket = layout.buckets[layout.buckets.length - 1];
            const bw = lastBucket.width;
            const bh = lastBucket.height;
            const elements = [];
            for (let i = category.buckets.length; i < totalSlots; i++) {
              const col = i % layout.bucketGridCols;
              const row = Math.floor(i / layout.bucketGridCols);
              const firstBucket = layout.buckets[0];
              const gapX = layout.bucketGridCols > 1 && layout.buckets.length > 1
                ? layout.buckets[1].x - layout.buckets[0].x
                : bw + 15;
              const gapY = layout.bucketGridRows > 1 && layout.buckets.length > layout.bucketGridCols
                ? layout.buckets[layout.bucketGridCols].y - layout.buckets[0].y
                : bh + 15;
              elements.push(
                <div
                  key={`empty-${i}`}
                  style={{
                    position: 'absolute',
                    left: firstBucket.x + col * gapX,
                    top: firstBucket.y + row * gapY,
                    width: bw,
                    height: bh,
                    borderRadius: 4,
                    overflow: 'hidden',
                    backgroundColor: `${branding.secondaryColor}40`,
                  }}
                >
                  <TechPattern color={branding.textColor} opacity={0.12} width={bw} height={bh} />
                </div>
              );
            }
            return elements;
          })()}
        </div>

        {/* Resize handle - bottom right corner */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 20,
            height: 20,
            cursor: 'se-resize',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(category.id, e);
          }}
          title="Drag to resize"
        >
          {/* Grip indicator */}
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.5 }}>
            <line x1="9" y1="1" x2="1" y2="9" stroke={branding.textColor} strokeWidth="1.5" />
            <line x1="9" y1="5" x2="5" y2="9" stroke={branding.textColor} strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
