export interface CategoryLayoutOverride {
  x: number;
  y: number;
  scale: number; // uniform scale factor (1.0 = original size, aspect ratio locked)
}

export interface LegendLayoutOverride {
  x: number;
  y: number;
}

export interface LandscapeProject {
  title: string;
  subtitle?: string;
  legend: LegendConfig;
  categories: Category[];
  branding: BrandingConfig;
  layoutOverrides?: Record<string, CategoryLayoutOverride>;
  legendOverride?: LegendLayoutOverride;
}

export interface Category {
  id: string;
  name: string;
  buckets: Bucket[];
}

export interface Bucket {
  id: string;
  title: string;
  values: (string | number)[];
}

export interface LegendConfig {
  labels: string[];
  format: '2-value' | '3-value';
}

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  titleColor: string;
  valueColor: string;
  backgroundColor: string;
  logo?: string;
  logoScale?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
  fontFamily: string;
  backgroundImage?: string;
  titleFontAdjust?: number;  // offset applied to auto-computed title font size
  valueFontAdjust?: number;  // offset applied to auto-computed value font size
  categoryOpacity?: number;  // 0-100, opacity for category (full) cards
  bucketOpacity?: number;    // 0-100, opacity for bucket cards
  legendOpacity?: number;    // 0-100, opacity for legend card
  legendLogo?: string;       // data URL for logo displayed in legend card
  legendLogoScale?: number;  // 20-200, percentage scale for legend logo
  legendCardColor?: string;  // custom background color for legend card
  legendTitleColor?: string;  // color for "LEGEND" title text
  legendLabelColor?: string;  // color for legend label text (e.g. "Patents : Applications")
}

export const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#003087',
  secondaryColor: '#004aad',
  accentColor: '#ffd700',
  textColor: '#ffffff',
  titleColor: '#ffffff',
  valueColor: '#ffffff',
  backgroundColor: '#001a4d',
  fontFamily: 'Arial, sans-serif',
};

export const DEFAULT_LEGEND: LegendConfig = {
  labels: ['Patents', 'Applications'],
  format: '2-value',
};

// Layout engine types
export interface BucketLayout {
  bucketId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CategoryLayout {
  categoryId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  headerHeight: number;
  bucketGridCols: number;
  bucketGridRows: number;
  buckets: BucketLayout[];
}

export interface LayoutResult {
  canvasWidth: number;
  canvasHeight: number;
  header: { x: number; y: number; width: number; height: number };
  legend: { x: number; y: number; width: number; height: number };
  categories: CategoryLayout[];
  bucketSize: { width: number; height: number };
  titleFontSize: number;
  valueFontSize: number;
}
