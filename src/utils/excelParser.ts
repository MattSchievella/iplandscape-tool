import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { LandscapeProject, Category, Bucket, LegendConfig, BrandingConfig } from '../types';
import { DEFAULT_BRANDING, DEFAULT_LEGEND } from '../types';

interface ParseResult {
  project: LandscapeProject;
  errors: string[];
  warnings: string[];
}

export function parseExcelFile(data: ArrayBuffer): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const workbook = XLSX.read(data, { type: 'array' });

  // Parse config sheet if it exists
  let title = 'Default Project ipLandscape';
  let subtitle = '';
  let titleFromConfig = false;
  let legend: LegendConfig = { ...DEFAULT_LEGEND };
  let branding: BrandingConfig = { ...DEFAULT_BRANDING };

  if (workbook.SheetNames.includes('Config')) {
    const configSheet = workbook.Sheets['Config'];
    const configData = XLSX.utils.sheet_to_json<Record<string, string>>(configSheet, { header: ['key', 'value'] });

    for (const row of configData) {
      const key = String(row.key || '').toLowerCase().trim();
      const value = String(row.value || '').trim();
      if (key === 'title') { title = value; titleFromConfig = true; }
      if (key === 'subtitle') subtitle = value;
      if (key === 'primary color' || key === 'primarycolor') branding = { ...branding, primaryColor: value };
      if (key === 'secondary color' || key === 'secondarycolor') branding = { ...branding, secondaryColor: value };
      if (key === 'accent color' || key === 'accentcolor') branding = { ...branding, accentColor: value };
      if (key === 'text color' || key === 'textcolor') branding = { ...branding, textColor: value };
      if (key === 'background color' || key === 'backgroundcolor') branding = { ...branding, backgroundColor: value };
      if (key === 'font') branding = { ...branding, fontFamily: value };
    }
  }

  // Parse data sheet (first sheet or sheet named "Data")
  const dataSheetName = workbook.SheetNames.includes('Data') ? 'Data' : workbook.SheetNames[0];
  const dataSheet = workbook.Sheets[dataSheetName];

  if (!dataSheet) {
    errors.push('No data sheet found in the workbook.');
    return { project: createEmptyProject(), errors, warnings };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(dataSheet, { header: 1 }) as unknown[][];

  if (rows.length < 2) {
    errors.push('Data sheet must have at least a header row and one data row.');
    return { project: createEmptyProject(), errors, warnings };
  }

  // Find the header row - skip title/blank rows at the top
  let headerRowIndex = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    const firstCell = String(row[0] || '').trim().toLowerCase();
    if (firstCell === 'category') {
      headerRowIndex = i;
      break;
    }
  }

  // Use the first row of the Data sheet as the project title, second row as subtitle/client name
  if (headerRowIndex > 0) {
    const firstRow = rows[0];
    if (firstRow && firstRow.length >= 1) {
      const firstCell = String(firstRow[0] || '').trim();
      if (firstCell && firstCell.toLowerCase() !== 'category') {
        title = firstCell;
      }
    }
    if (headerRowIndex > 1 && rows[1]) {
      const secondCell = String(rows[1][0] || '').trim();
      if (secondCell && secondCell.toLowerCase() !== 'category') {
        subtitle = secondCell;
      }
    }
  }

  const header = rows[headerRowIndex].map(cell => String(cell || '').trim());

  // Detect format: look at how many value columns we have
  // Expected: Category | Bucket | Value1 | Value2 | [Value3]
  const hasThreeValues = header.length >= 5 && header[4] !== '';

  if (hasThreeValues) {
    legend = {
      labels: [header[2] || 'Value 1', header[3] || 'Value 2', header[4] || 'Value 3'],
      format: '3-value',
    };
  } else {
    legend = {
      labels: [header[2] || 'Value 1', header[3] || 'Value 2'],
      format: '2-value',
    };
  }

  // Parse data rows into categories
  const categoryMap = new Map<string, Category>();

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;

    const categoryName = String(row[0] || '').trim();
    const bucketTitle = String(row[1] || '').trim();
    const val1 = Number(row[2]) || 0;
    const val2 = Number(row[3]) || 0;
    const val3 = hasThreeValues ? (Number(row[4]) || 0) : undefined;

    if (!categoryName || !bucketTitle) {
      warnings.push(`Row ${i + 1}: Missing category or bucket name, skipped.`);
      continue;
    }

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        id: uuidv4(),
        name: categoryName,
        buckets: [],
      });
    }

    const bucket: Bucket = {
      id: uuidv4(),
      title: bucketTitle,
      values: val3 !== undefined ? [val1, val2, val3] : [val1, val2],
    };

    categoryMap.get(categoryName)!.buckets.push(bucket);
  }

  const categories = Array.from(categoryMap.values());

  if (categories.length === 0) {
    errors.push('No valid data rows found. Ensure the sheet has Category, Bucket, and Value columns.');
  }

  return {
    project: {
      title,
      subtitle,
      legend,
      categories,
      branding,
    },
    errors,
    warnings,
  };
}

function createEmptyProject(): LandscapeProject {
  return {
    title: 'Default Project ipLandscape',
    subtitle: '',
    legend: { ...DEFAULT_LEGEND },
    categories: [],
    branding: { ...DEFAULT_BRANDING },
  };
}

export function generateTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Data sheet with title and example data
  const dataRows: (string | number)[][] = [
    ['ipLandscape Template'],
    ['Client Name'],
    [],
    ['Category', 'Bucket', 'Patents', 'Applications', 'Inactive'],
    ['COOLING METHOD', 'SINGLE PHASE', 258, 87, 12],
    ['COOLING METHOD', 'COLD PLATE', 175, 53, 8],
    ['COOLING METHOD', 'MANIFOLD', 172, 35, 5],
    ['COOLING METHOD', '2 PHASE', 170, 47, 3],
    ['COOLING METHOD', 'IMMERSIVE', 193, 77, 15],
    ['SYSTEM FEATURES', 'CONTROL OTHER EQUIPMENT', 47, 13, 2],
    ['SYSTEM FEATURES', 'AUTOCONFIGURE', 3, 2, 0],
    ['SYSTEM FEATURES', 'MODULAR INTEGRATION', 63, 16, 4],
    ['SYSTEM FEATURES', 'LEAK DETECTION', 53, 7, 1],
  ];
  const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);

  // Set column widths for better readability
  dataSheet['!cols'] = [
    { wch: 22 },  // Category
    { wch: 30 },  // Bucket
    { wch: 12 },  // Patents
    { wch: 14 },  // Applications
    { wch: 12 },  // Inactive
  ];

  // Merge title and client name rows across all columns
  dataSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];

  XLSX.utils.book_append_sheet(wb, dataSheet, 'Data');

  // Config sheet
  const configRows = [
    ['Title', 'Data Center Cooling ipLandscape'],
    ['Subtitle', 'Client Name'],
    ['Primary Color', '#003087'],
    ['Secondary Color', '#004aad'],
    ['Accent Color', '#ffd700'],
    ['Text Color', '#ffffff'],
    ['Background Color', '#001a4d'],
    ['Font', 'Arial, sans-serif'],
  ];
  const configSheet = XLSX.utils.aoa_to_sheet(configRows);
  configSheet['!cols'] = [
    { wch: 20 },  // Key
    { wch: 40 },  // Value
  ];
  XLSX.utils.book_append_sheet(wb, configSheet, 'Config');

  return wb;
}
