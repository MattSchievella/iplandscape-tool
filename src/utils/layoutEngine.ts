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
const CATEGORY_PAD = 15;
const BUCKET_GAP = 10;
const MAX_BUCKET_W = 300;
const MAX_BUCKET_H = 200;
const MIN_BUCKET_W = 50;
const MIN_BUCKET_H = 35;
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
 * Determine optimal number of bucket sub-columns for a category,
 * given available column width and a target bucket width.
 * Allows up to as many columns as can physically fit.
 */
function optimalSubGridCols(bucketCount: number, colWidth: number, targetBucketW: number): number {
  if (bucketCount === 0) return 1;
  const innerWidth = colWidth - 2 * CATEGORY_PAD;
  // Max cols that physically fit
  const maxFit = Math.max(1, Math.floor((innerWidth + BUCKET_GAP) / (targetBucketW + BUCKET_GAP)));
  // Don't use more columns than buckets
  return Math.min(bucketCount, maxFit);
}

/**
 * Compute the height of a category given its bucket grid dimensions.
 */
function categoryHeight(rows: number, bucketH: number): number {
  if (rows === 0) return CATEGORY_HEADER_H + 2 * CATEGORY_PAD;
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

  // Sort tallest first for better packing
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
 * Try a specific layout configuration and return a scored result.
 */
function tryLayout(
  categories: LandscapeProject['categories'],
  branding: LandscapeProject['branding'],
  allTitles: string[],
  allValues: string[],
  numCols: number,
  targetBucketW: number,
): { result: LayoutResult; fits: boolean; score: number } | null {
  const colWidth = (CONTENT_W - (numCols - 1) * COLUMN_GAP) / numCols;
  if (colWidth < 120) return null;

  // Compute actual bucket width within the column
  // Each category can have a different number of sub-columns
  const catGridInfo = categories.map(c => {
    const subCols = optimalSubGridCols(c.buckets.length, colWidth, targetBucketW);
    const innerWidth = colWidth - 2 * CATEGORY_PAD;
    const bucketW = Math.min(MAX_BUCKET_W, Math.floor((innerWidth - (subCols - 1) * BUCKET_GAP) / subCols));
    const rows = Math.ceil(c.buckets.length / subCols);
    return { subCols, rows, bucketW };
  });

  // Use smallest bucket width across all categories for consistency
  const bucketW = Math.min(...catGridInfo.map(c => c.bucketW));
  if (bucketW < MIN_BUCKET_W) return null;

  // Recompute sub-cols with the uniform bucket width
  const catInfo = categories.map(c => {
    const subCols = optimalSubGridCols(c.buckets.length, colWidth, bucketW);
    const rows = c.buckets.length === 0 ? 0 : Math.ceil(c.buckets.length / subCols);
    return { subCols, rows };
  });

  // Compute category heights for different bucket heights and find optimal bucketH
  // First figure out the fixed overhead per column
  const catFixedHeights = catInfo.map(c => ({
    fixedH: CATEGORY_HEADER_H + 2 * CATEGORY_PAD + (c.rows > 1 ? (c.rows - 1) * BUCKET_GAP : 0),
    rows: c.rows,
  }));

  // Trial pack to figure out which categories go where
  const trialHeights = catFixedHeights.map(c => c.fixedH + c.rows * 50);
  const trialColumns = packColumns(trialHeights, numCols);

  // Find the most constrained column to determine max bucket height
  let maxColumnFixedH = 0;
  let maxColumnRows = 0;
  for (const col of trialColumns) {
    let colFixedH = 0;
    let colRows = 0;
    for (const item of col.categories) {
      colFixedH += catFixedHeights[item.idx].fixedH;
      colRows += catFixedHeights[item.idx].rows;
    }
    colFixedH += Math.max(0, col.categories.length - 1) * CATEGORY_GAP;
    if (colFixedH + colRows > maxColumnFixedH + maxColumnRows) {
      maxColumnFixedH = colFixedH;
      maxColumnRows = colRows;
    }
  }

  let bucketH = maxColumnRows === 0
    ? MAX_BUCKET_H
    : Math.min(MAX_BUCKET_H, Math.floor((CONTENT_H - maxColumnFixedH) / maxColumnRows));
  if (bucketH < MIN_BUCKET_H) return null;

  // Re-pack with actual heights — shrink bucketH if needed to guarantee fit
  let finalColumns = packColumns(catInfo.map(c => categoryHeight(c.rows, bucketH)), numCols);
  let tallest = Math.max(...finalColumns.map(col => col.totalHeight));

  while (tallest > CONTENT_H && bucketH > MIN_BUCKET_H) {
    bucketH--;
    finalColumns = packColumns(catInfo.map(c => categoryHeight(c.rows, bucketH)), numCols);
    tallest = Math.max(...finalColumns.map(col => col.totalHeight));
  }

  if (bucketH < MIN_BUCKET_H) return null;
  const fitsInCanvas = tallest <= CONTENT_H;

  // Build layout
  const categoryLayouts: CategoryLayout[] = [];

  for (let colIdx = 0; colIdx < finalColumns.length; colIdx++) {
    const col = finalColumns[colIdx];
    const colX = CONTENT_X + colIdx * (colWidth + COLUMN_GAP);
    let curY = CONTENT_Y;

    col.categories.sort((a, b) => a.idx - b.idx);

    for (const item of col.categories) {
      const cat = categories[item.idx];
      const info = catInfo[item.idx];
      const catH = categoryHeight(info.rows, bucketH);

      const bucketLayouts: BucketLayout[] = [];
      for (let bi = 0; bi < cat.buckets.length; bi++) {
        const bCol = bi % info.subCols;
        const bRow = Math.floor(bi / info.subCols);
        const totalBucketsWidth = info.subCols * bucketW + (info.subCols - 1) * BUCKET_GAP;
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
        bucketGridCols: info.subCols,
        bucketGridRows: info.rows,
        buckets: bucketLayouts,
      });

      curY += catH + CATEGORY_GAP;
    }
  }

  // Font sizing
  const titleAreaH = bucketH * 0.45;
  const valueAreaH = bucketH * 0.45;
  const titleFont = fitFontSize(allTitles, bucketW - 12, titleAreaH, branding.fontFamily, '800', 16);
  const valueFont = fitFontSize(allValues, bucketW - 12, valueAreaH, branding.fontFamily, '800', 22);

  const result: LayoutResult = {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    header: { x: PADDING, y: PADDING, width: CONTENT_W, height: HEADER_H },
    legend: { x: CANVAS_W - PADDING - 320, y: CANVAS_H - PADDING - LEGEND_H, width: 320, height: LEGEND_H },
    categories: categoryLayouts,
    bucketSize: { width: bucketW, height: bucketH },
    titleFontSize: titleFont,
    valueFontSize: valueFont,
    legendPlacement: 'footer',
  };

  // Score: prefer larger buckets
  const area = bucketW * bucketH;
  return { result, fits: fitsInCanvas, score: area };
}

// Fill layout: the legend moves into the header band, so content runs to the bottom padding
const FILL_CONTENT_H = CANVAS_H - PADDING - HEADER_H - PADDING;
const FILL_MAX_ROWS = 4;
const FILL_SEARCH_BUDGET = 500_000;
const EMPTY_SLOT_PENALTY = 0.75;

interface FillShelf {
  start: number;  // first category index (inclusive)
  end: number;    // last category index (exclusive)
  rows: number;
  cols: number[]; // bucket columns for each category in the shelf
  bucketW: number;
  empties: number;
}

interface FillPlan {
  shelves: FillShelf[];
  bucketW: number; // narrowest shelf's bucket width
  bucketH: number;
}

// Plans depend only on bucket counts, so reuse them across re-renders
const fillPlanCache = new Map<string, FillPlan | null>();

/**
 * Bucket height when shelves with this many total rows exactly fill the content height.
 */
function fillBucketHeight(rows: number, shelves: number): number {
  const overhead = shelves * (CATEGORY_HEADER_H + 2 * CATEGORY_PAD)
    + (shelves - 1) * CATEGORY_GAP
    + (rows - shelves) * BUCKET_GAP;
  return (FILL_CONTENT_H - overhead) / rows;
}

/**
 * Split categories (kept in order) into full-width shelves and pick a row count
 * per shelf. Bucket height is shared; bucket width stretches per shelf so every
 * shelf spans the canvas. Prefers large, evenly sized buckets with no empty slots.
 */
function planFillLayout(counts: number[]): FillPlan | null {
  const k = counts.length;

  // Fewer row options as category count grows, to keep the search fast
  let maxRows = FILL_MAX_ROWS;
  while (maxRows > 1 && maxRows * Math.pow(maxRows + 1, k - 1) > FILL_SEARCH_BUDGET) maxRows--;

  // shelfOptions[i][j] = candidate shelves holding categories i..j-1
  const shelfOptions: FillShelf[][][] = [];
  for (let i = 0; i < k; i++) {
    shelfOptions[i] = [];
    for (let j = i + 1; j <= k; j++) {
      const group = counts.slice(i, j);
      const options: FillShelf[] = [];
      const rowLimit = Math.min(maxRows, Math.max(1, ...group));
      for (let rows = 1; rows <= rowLimit; rows++) {
        const cols = group.map(n => Math.max(1, Math.ceil(n / rows)));
        const totalCols = cols.reduce((a, c) => a + c, 0);
        const fixedW = (group.length - 1) * CATEGORY_GAP
          + group.length * 2 * CATEGORY_PAD
          + cols.reduce((a, c) => a + (c - 1) * BUCKET_GAP, 0);
        const bucketW = (CONTENT_W - fixedW) / totalCols;
        if (bucketW < MIN_BUCKET_W) continue;
        const empties = group.reduce((a, n, gi) => a + (n === 0 ? 0 : cols[gi] * rows - n), 0);
        options.push({ start: i, end: j, rows, cols, bucketW, empties });
      }
      shelfOptions[i][j] = options;
    }
  }

  let bestScore = -Infinity;
  let bestPlan: FillPlan | null = null;
  const chosen: FillShelf[] = [];

  const search = (i: number, rows: number, wMin: number, wMax: number, empties: number) => {
    if (i === k) {
      const h = fillBucketHeight(rows, chosen.length);
      // Width past 3:1 or height past square doesn't help legibility
      const usable = Math.min(wMin, 3 * h) * Math.min(h, wMin);
      const score = usable * Math.sqrt(wMin / wMax) * Math.pow(EMPTY_SLOT_PENALTY, empties);
      if (score > bestScore) {
        bestScore = score;
        bestPlan = { shelves: [...chosen], bucketW: wMin, bucketH: h };
      }
      return;
    }
    for (let j = i + 1; j <= k; j++) {
      for (const shelf of shelfOptions[i][j]) {
        const nextRows = rows + shelf.rows;
        // More rows and shelves only shrink bucket height, so prune once too short
        if (fillBucketHeight(nextRows, chosen.length + 1) < MIN_BUCKET_H) continue;
        chosen.push(shelf);
        search(j, nextRows, Math.min(wMin, shelf.bucketW), Math.max(wMax, shelf.bucketW), empties + shelf.empties);
        chosen.pop();
      }
    }
  };
  search(0, 0, Infinity, 0, 0);

  return bestPlan;
}

/**
 * Fill layout: full-width rows of categories that cover the whole canvas.
 * Returns null when no arrangement fits, so the caller can fall back to columns.
 */
function computeFillLayout(
  categories: LandscapeProject['categories'],
  branding: LandscapeProject['branding'],
  allTitles: string[],
  allValues: string[],
): LayoutResult | null {
  const counts = categories.map(c => c.buckets.length);
  const key = counts.join(',');
  if (!fillPlanCache.has(key)) fillPlanCache.set(key, planFillLayout(counts));
  const plan = fillPlanCache.get(key);
  if (!plan) return null;

  const bucketH = Math.floor(plan.bucketH);
  const stackH = plan.shelves.reduce((a, s) => a + categoryHeight(s.rows, bucketH), 0)
    + (plan.shelves.length - 1) * CATEGORY_GAP;
  let curY = CONTENT_Y + Math.floor((FILL_CONTENT_H - stackH) / 2);

  const categoryLayouts: CategoryLayout[] = [];
  for (const shelf of plan.shelves) {
    const bucketW = Math.floor(shelf.bucketW);
    const catH = categoryHeight(shelf.rows, bucketH);
    const catWidths = shelf.cols.map(c => c * bucketW + (c - 1) * BUCKET_GAP + 2 * CATEGORY_PAD);
    const shelfW = catWidths.reduce((a, w) => a + w, 0) + (catWidths.length - 1) * CATEGORY_GAP;
    let curX = CONTENT_X + Math.floor((CONTENT_W - shelfW) / 2);

    shelf.cols.forEach((subCols, offset) => {
      const cat = categories[shelf.start + offset];
      categoryLayouts.push({
        categoryId: cat.id,
        x: curX,
        y: curY,
        width: catWidths[offset],
        height: catH,
        headerHeight: CATEGORY_HEADER_H,
        bucketGridCols: subCols,
        bucketGridRows: shelf.rows,
        buckets: cat.buckets.map((b, bi) => ({
          bucketId: b.id,
          x: CATEGORY_PAD + (bi % subCols) * (bucketW + BUCKET_GAP),
          y: CATEGORY_PAD + Math.floor(bi / subCols) * (bucketH + BUCKET_GAP),
          width: bucketW,
          height: bucketH,
        })),
      });
      curX += catWidths[offset] + CATEGORY_GAP;
    });

    curY += catH + CATEGORY_GAP;
  }

  // Size fonts for the narrowest buckets so text is uniform across rows
  const narrowestW = Math.floor(plan.bucketW);
  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    header: { x: PADDING, y: PADDING, width: CONTENT_W, height: HEADER_H },
    legend: { x: CANVAS_W - PADDING - 320, y: PADDING, width: 320, height: HEADER_H },
    categories: categoryLayouts,
    bucketSize: { width: narrowestW, height: bucketH },
    titleFontSize: fitFontSize(allTitles, narrowestW - 12, bucketH * 0.45, branding.fontFamily, '800', 16),
    valueFontSize: fitFontSize(allValues, narrowestW - 12, bucketH * 0.45, branding.fontFamily, '800', 22),
    legendPlacement: 'header',
  };
}

/**
 * Main layout computation.
 */
export function computeLayout(project: LandscapeProject): LayoutResult {
  const { categories, branding, legend } = project;

  if (categories.length === 0) {
    return emptyLayout();
  }

  // Collect all bucket titles and value strings for font sizing
  const allTitles = categories.flatMap(c => c.buckets.map(b => b.title));
  const allValues = categories.flatMap(c =>
    c.buckets.map(b =>
      legend.format === '3-value'
        ? `${b.values[0]} : ${b.values[1]} : ${b.values[2] ?? 0}`
        : `${b.values[0]} : ${b.values[1]}`
    )
  );

  if (project.layoutMode === 'fill') {
    const fill = computeFillLayout(categories, branding, allTitles, allValues);
    if (fill) return fill;
  }

  let best: { result: LayoutResult; score: number } | null = null;

  const maxCols = Math.min(categories.length, 8);

  // Try different column counts and target bucket widths
  for (let numCols = 1; numCols <= maxCols; numCols++) {
    for (let targetW = MAX_BUCKET_W; targetW >= MIN_BUCKET_W; targetW -= 20) {
      const attempt = tryLayout(categories, branding, allTitles, allValues, numCols, targetW);
      if (!attempt) continue;

      if (!best || attempt.score > best.score) {
        best = { result: attempt.result, score: attempt.score };
      }
    }
  }

  return best?.result || emptyLayout();
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
    legendPlacement: 'footer',
  };
}
