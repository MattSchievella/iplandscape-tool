export interface LandscapeProject {
  title: string;
  subtitle?: string;
  legend: LegendConfig;
  categories: Category[];
  branding: BrandingConfig;
}

export interface Category {
  id: string;
  name: string;
  buckets: Bucket[];
}

export interface Bucket {
  id: string;
  title: string;
  values: number[];
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
  logoOffsetY?: number;
  fontFamily: string;
  backgroundImage?: string;
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
