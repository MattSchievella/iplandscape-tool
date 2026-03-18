import type { LandscapeProject, LayoutResult, CategoryLayout, BucketLayout } from '../types';

// Canvas constants
const CANVAS_W = 1920;
const CANVAS_H = 1080;
const PADDING = 24;
const HEADER_H = 100;
const LEGEND_H = 40;
const COLUMN_GAP = 15;
const CATEGORY_GAP = 15;
const CATEGORY_HEADER_H = 40;
const CATEGORY_PAD = 15; // padding inside category around bucket grid
const BUCKET_GAP = 15;
const MAX_BUCKETS_PER_ROW = 3;
const MAX_BUCKET_W = 300;
const MAX_BUCKET_H = 200;
const MIN_FONT = 7;

// Usable content area
const CONTENT_X = PADDING;
const CONTENT_Y = PADDING + HEADER_H;
const CONTENT_W = CANVAS_W - 2 * PADDING;
const CONTENT_H = CANVAS_H - PADDING - HEADER_H - LEGEND_H - PADDING;

interface ColumnPack {
  categories: { idx: number; height: number }[];
  totalHeight: number;
}

/**
 * Compute how many sub-grid columns a category's buckets use (max 3).
 */
function subGridCols(bucketCount: number): number {
  return Math.min(Math.max(bucketCount, 1), MAX_BUCKETS_PER_ROW);
}

/**
 * Compute the height of a category given bucket size and bucket count.
 */
function categoryHeight(bucketCount: number, bucketH: number): number {
  if (bucketCount === 0) return CATEGORY_HEADER_H + 2 * CATEGORY_PAD;
  const cols = subGridCols(bucketCount);
  const rows = Math.ceil(bucketCount / cols);
  return CATEGORY_HEADER_H + 2 * CATEGORY_PAD + rows * bucketH + (rows - 1) * BUCKET_GAP;
}

/**
 * Pack categories into N columns using greedy shortest-column-first.
 */
function packColumns(
  categoryHeights: number[],
  numCols: number
): ColumnPack[] {
  const columns: ColumnPack[] = Array.from({ length: numCols }, () => ({
    categories: [],
    totalHeight: 0,
  }));

  // Create sorted indices (tallest first for better packing)
  const sorted = categoryHeights
    .map((h, i) => ({ idx: i, height: h }))
    .sort((a, b) => b.height - a.height);

  for (const item of sorted) {
    let minCol = 0;
    for (let c = 1; c < numCols; c++) {
      if (columns[c].totalHeight < columns[minCol].totalHeight) {
        minCol = c;
      }
    }
    columns[minCol].categories.push(item);
    columns[minCol].totalHeight += item.height + (columns[minCol].categories.length > 1 ? CATEGORY_GAP : 0);
  }

  return columns;
}

/**
 * Measure text width using an off-screen canvas.
 */
function measureText(text: string, fontSize: number, fontFamily: string, fontWeight: string = 'bold'): number {
  if (typeof document === 'undefined') return text.length * fontSize * 0.6;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily.split(',')[0].trim()}`;
  return ctx.measureText(text).width;
}

/**
 * Find the largest font size (down to MIN_FONT) where ALL texts fit within maxWidth.
 */
function fitFontSize(
  texts: string[],
  maxWidth: number,
  maxHeight: number,
  fontFamily: string,
  fontWeight: string = 'bold',
  startSize: number = 24
): number {
  if (texts.length === 0) return startSize;
  let size = startSize;
  while (size > MIN_FONT) {
    const fits = texts.every(t => measureText(t, size, fontFamily, fontWeight) <= maxWidth);
    if (fits && size * 1.2 <= maxHeight) return size;
    size--;
  }
  return MIN_FONT;
}

/**
 * Main layout computation.
 */
export function computeLayout(project: LandscapeProject): LayoutResult {
  const { categories, branding, legend } = project;

  if (categories.length === 0) {
    return emptyLayout();
  }

  // Collect all bucket titles and value strings for font sizing later
  const allTitles = categories.flatMap(c => c.buckets.map(b => b.title));
  const allValues = categories.flatMap(c =>
    c.buckets.map(b =>
      legend.format === '3-value'
        ? `${b.values[0]} : ${b.values[1]} : ${b.values[2] ?? 0}`
        : `${b.values[0]} : ${b.values[1]}`
    )
  );

  let bestResult: LayoutResult | null = null;
  let bestBucketArea = 0;

  // Try different column counts
  for (let numCols = 2; numCols <= 6; numCols++) {
    const colWidth = (CONTENT_W - (numCols - 1) * COLUMN_GAP) / numCols;
    if (colWidth < 150) continue;

    const maxSubCols = Math.max(...categories.map(c => subGridCols(c.buckets.length)), 1);
    const bucketW = Math.floor(Math.min(
      MAX_BUCKET_W,
      (colWidth - 2 * CATEGORY_PAD - (maxSubCols - 1) * BUCKET_GAP) / maxSubCols
    ));
    if (bucketW < 60) continue;

    const catHeightsPerBucket = categories.map(c => {
      const cols = subGridCols(c.buckets.length);
      const rows = Math.ceil(c.buckets.length / cols);
      return {
        fixedH: CATEGORY_HEADER_H + 2 * CATEGORY_PAD + (rows - 1) * BUCKET_GAP,
        rows,
      };
    });

    const trialHeights = catHeightsPerBucket.map(c => c.fixedH + c.rows * 50);
    const columns = packColumns(trialHeights, numCols);

    let maxColumnFixedH = 0;
    let maxColumnRows = 0;

    for (const col of columns) {
      let colFixedH = 0;
      let colRows = 0;
      for (const item of col.categories) {
        const catInfo = catHeightsPerBucket[item.idx];
        colFixedH += catInfo.fixedH;
        colRows += catInfo.rows;
      }
      const catGaps = Math.max(0, col.categories.length - 1) * CATEGORY_GAP;
      colFixedH += catGaps;

      if (colFixedH + colRows > maxColumnFixedH + maxColumnRows) {
        maxColumnFixedH = colFixedH;
        maxColumnRows = colRows;
      }
    }

    const bucketH = maxColumnRows === 0
      ? MAX_BUCKET_H
      : Math.min(
          MAX_BUCKET_H,
          Math.floor((CONTENT_H - maxColumnFixedH) / maxColumnRows)
        );
    if (bucketH < 40) continue;

    const area = bucketW * bucketH;
    if (area <= bestBucketArea) continue;

    // Re-pack with actual heights
    const actualHeights = categories.map(c => categoryHeight(c.buckets.length, bucketH));
    const finalColumns = packColumns(actualHeights, numCols);

    // Verify tallest column fits
    const tallest = Math.max(...finalColumns.map(col => col.totalHeight));
    if (tallest > CONTENT_H) continue;

    // Build layout result
    const categoryLayouts: CategoryLayout[] = [];

    for (let colIdx = 0; colIdx < finalColumns.length; colIdx++) {
      const col = finalColumns[colIdx];
      const colX = CONTENT_X + colIdx * (colWidth + COLUMN_GAP);
      let curY = CONTENT_Y;

      col.categories.sort((a, b) => a.idx - b.idx);

      for (const item of col.categories) {
        const cat = categories[item.idx];
        const cols = subGridCols(cat.buckets.length);
        const catH = categoryHeight(cat.buckets.length, bucketH);

        const bucketLayouts: BucketLayout[] = [];
        for (let bi = 0; bi < cat.buckets.length; bi++) {
          const bCol = bi % cols;
          const bRow = Math.floor(bi / cols);
          const totalBucketsWidth = cols * bucketW + (cols - 1) * BUCKET_GAP;
          const bucketOffsetX = (colWidth - totalBucketsWidth) / 2;

          bucketLayouts.push({
            bucketId: cat.buckets[bi].id,
            x: bucketOffsetX + bCol * (bucketW + BUCKET_GAP),
            y: CATEGORY_PAD + bRow * (bucketH + BUCKET_GAP),
            width: bucketW,
            height: bucketH,
          });
        }

        categoryLayouts.push({
          categoryId: cat.id,
          x: colX,
          y: curY,
          width: colWidth,
          height: catH,
          headerHeight: CATEGORY_HEADER_H,
          bucketGridCols: cols,
          bucketGridRows: Math.ceil(cat.buckets.length / cols),
          buckets: bucketLayouts,
        });

        curY += catH + CATEGORY_GAP;
      }
    }

    // Compute font sizes - title allows 2-line wrap, values single line
    const titleAreaH = bucketH * 0.45;
    const valueAreaH = bucketH * 0.45;
    const titleFont = fitFontSize(allTitles, bucketW - 12, titleAreaH, branding.fontFamily, '800', 16);
    const valueFont = fitFontSize(allValues, bucketW - 12, valueAreaH, branding.fontFamily, '800', 22);

    bestResult = {
      canvasWidth: CANVAS_W,
      canvasHeight: CANVAS_H,
      header: { x: PADDING, y: PADDING, width: CONTENT_W, height: HEADER_H },
      legend: { x: CANVAS_W - PADDING - 320, y: CANVAS_H - PADDING - LEGEND_H, width: 320, height: LEGEND_H },
      categories: categoryLayouts,
      bucketSize: { width: bucketW, height: bucketH },
      titleFontSize: titleFont,
      valueFontSize: valueFont,
    };
    bestBucketArea = area;
  }

  return bestResult || emptyLayout();
}

function emptyLayout(): LayoutResult {
  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    header: { x: PADDING, y: PADDING, width: CONTENT_W, height: HEADER_H },
    legend: { x: CANVAS_W - PADDING - 320, y: CANVAS_H - PADDING - LEGEND_H, width: 320, height: LEGEND_H },
    categories: [],
    bucketSize: { width: 0, height: 0 },
    titleFontSize: 12,
    valueFontSize: 18,
  };
}
