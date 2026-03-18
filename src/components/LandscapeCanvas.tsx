import { forwardRef, useMemo } from 'react';
import type { LandscapeProject } from '../types';
import { CategoryBlock } from './CategoryBlock';
import { computeLayout } from '../utils/layoutEngine';

const PADDING = 24;

interface LandscapeCanvasProps {
  project: LandscapeProject;
  onEditBucket: (categoryId: string, bucketId: string) => void;
  onEditCategory: (categoryId: string) => void;
}

export const LandscapeCanvas = forwardRef<HTMLDivElement, LandscapeCanvasProps>(
  function LandscapeCanvas({ project, onEditBucket, onEditCategory }, ref) {
    const { branding, legend, categories } = project;

    const layout = useMemo(() => computeLayout(project), [project]);

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
            return (
              <CategoryBlock
                key={category.id}
                category={category}
                legend={legend}
                branding={branding}
                layout={catLayout}
                titleFontSize={layout.titleFontSize}
                valueFontSize={layout.valueFontSize}
                onEditBucket={onEditBucket}
                onEditCategory={onEditCategory}
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
