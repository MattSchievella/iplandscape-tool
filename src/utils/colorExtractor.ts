// Named CSS colors mapping (common ones)
const NAMED_COLORS: Record<string, string> = {
  red: '#ff0000', blue: '#0000ff', green: '#008000', yellow: '#ffff00',
  orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', cyan: '#00ffff',
  magenta: '#ff00ff', navy: '#000080', teal: '#008080', maroon: '#800000',
  olive: '#808000', lime: '#00ff00', aqua: '#00ffff', coral: '#ff7f50',
  crimson: '#dc143c', indigo: '#4b0082', tomato: '#ff6347', gold: '#ffd700',
  salmon: '#fa8072', turquoise: '#40e0d0', violet: '#ee82ee', khaki: '#f0e68c',
  orchid: '#da70d6', sienna: '#a0522d', plum: '#dda0dd', tan: '#d2b48c',
  peru: '#cd853f', slateblue: '#6a5acd', steelblue: '#4682b4', darkblue: '#00008b',
  darkgreen: '#006400', darkred: '#8b0000', deeppink: '#ff1493', dodgerblue: '#1e90ff',
  firebrick: '#b22222', forestgreen: '#228b22', royalblue: '#4169e1',
  midnightblue: '#191970', darkslategray: '#2f4f4f', darkcyan: '#008b8b',
  darkmagenta: '#8b008b', darkorange: '#ff8c00', darkviolet: '#9400d3',
  deepskyblue: '#00bfff', mediumblue: '#0000cd', mediumseagreen: '#3cb371',
  seagreen: '#2e8b57', slategray: '#708090', cadetblue: '#5f9ea0',
  cornflowerblue: '#6495ed', mediumpurple: '#9370db', mediumvioletred: '#c71585',
};

// Colors to filter out (too generic / not brand-like)
const EXCLUDED_COLORS = new Set([
  '#000000', '#ffffff', '#fff', '#000', '#f5f5f5', '#eeeeee', '#e5e5e5',
  '#d4d4d4', '#cccccc', '#333333', '#222222', '#111111', '#fafafa',
  '#f0f0f0', '#e0e0e0', '#f8f8f8', '#f9f9f9', '#fbfbfb', '#fdfdfd',
  '#fefefe', '#fcfcfc', '#e8e8e8', '#d0d0d0', '#c0c0c0', '#b0b0b0',
  '#a0a0a0', '#808080', '#999999', '#aaaaaa', '#bbbbbb', '#dddddd',
  'transparent', 'inherit', 'initial', 'currentcolor', 'none',
]);

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else {
    return null;
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeColor(raw: string): string | null {
  const val = raw.trim().toLowerCase();

  // Skip excluded
  if (EXCLUDED_COLORS.has(val)) return null;

  // Hex colors
  const hexMatch = val.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    const h = hexMatch[1];
    if (h.length === 3) return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length === 6) return '#' + h;
    if (h.length === 8) return '#' + h.slice(0, 6); // drop alpha
    return null;
  }

  // rgb()/rgba()
  const rgbMatch = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const hex = rgbToHex(+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]);
    if (EXCLUDED_COLORS.has(hex)) return null;
    return hex;
  }

  // Named colors
  if (NAMED_COLORS[val]) return NAMED_COLORS[val];

  return null;
}

export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

function colorDistance(hex1: string, hex2: string): number {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  if (!a || !b) return 999;
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function isTooNeutral(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const [r, g, b] = rgb;
  // If all channels are very close, it's a gray
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) < 15 && (max < 30 || min > 225);
}

function extractColorsFromHtml(html: string): string[] {
  const colorCounts = new Map<string, number>();

  const addColor = (raw: string) => {
    const hex = normalizeColor(raw);
    if (hex && !isTooNeutral(hex)) {
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }
  };

  // 1. Meta theme-color
  const metaTheme = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/gi);
  if (metaTheme) {
    for (const m of metaTheme) {
      const content = m.match(/content=["']([^"']+)["']/i);
      if (content) {
        const hex = normalizeColor(content[1]);
        if (hex) colorCounts.set(hex, (colorCounts.get(hex) || 0) + 10); // boost meta theme colors
      }
    }
  }

  // 2. CSS from <style> tags
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of styleBlocks) {
    const inner = block.replace(/<\/?style[^>]*>/gi, '');
    // Hex colors
    const hexes = inner.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    hexes.forEach(addColor);
    // rgb/rgba
    const rgbs = inner.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g) || [];
    rgbs.forEach(addColor);
  }

  // 3. Inline style attributes
  const inlineStyles = html.match(/style=["'][^"']*["']/gi) || [];
  for (const s of inlineStyles) {
    const hexes = s.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    hexes.forEach(addColor);
    const rgbs = s.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g) || [];
    rgbs.forEach(addColor);
  }

  // 4. SVG fill/stroke attributes
  const svgColors = html.match(/(?:fill|stroke)=["']#[0-9a-fA-F]{3,6}["']/gi) || [];
  for (const s of svgColors) {
    const hex = s.match(/#[0-9a-fA-F]{3,6}/);
    if (hex) addColor(hex[0]);
  }

  // 5. CSS custom properties that look like colors
  const cssVars = html.match(/--[\w-]+:\s*#[0-9a-fA-F]{3,8}/g) || [];
  for (const v of cssVars) {
    const hex = v.match(/#[0-9a-fA-F]{3,8}/);
    if (hex) addColor(hex[0]);
  }

  // Sort by frequency (descending)
  const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Deduplicate colors that are too similar (distance < 30)
  const result: string[] = [];
  for (const [color] of sorted) {
    if (result.length >= 5) break;
    const tooClose = result.some(existing => colorDistance(existing, color) < 30);
    if (!tooClose) result.push(color);
  }

  return result;
}

export async function extractColorsFromUrl(url: string): Promise<string[]> {
  // Normalize URL
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const encodedUrl = encodeURIComponent(normalizedUrl);

  // Multiple CORS proxy fallbacks for reliability
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodedUrl}`,
    `https://corsproxy.io/?${encodedUrl}`,
    `https://api.codetabs.com/v1/proxy?quest=${normalizedUrl}`,
    `https://cors-anywhere.herokuapp.com/${normalizedUrl}`,
  ];

  let lastError: Error | null = null;

  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = new Error(`Proxy returned ${response.status}`);
        continue;
      }

      const html = await response.text();

      if (!html || html.length < 100) {
        lastError = new Error('Response too short');
        continue;
      }

      const colors = extractColorsFromHtml(html);

      if (colors.length === 0) {
        throw new Error('No brand colors found on this website');
      }

      return colors;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // If it's a "no brand colors" error, don't try other proxies — the HTML was valid
      if (lastError.message === 'No brand colors found on this website') {
        throw lastError;
      }
      // Otherwise try next proxy
      continue;
    }
  }

  throw new Error(
    lastError?.message === 'No brand colors found on this website'
      ? lastError.message
      : 'Could not fetch website. All proxy services timed out. Please try again later.'
  );
}

/**
 * Maps extracted colors to branding fields by sorting by luminance.
 * Darkest → background, then primary, secondary, accent, lightest → text.
 */
export function mapColorsToBranding(colors: string[]): Partial<{
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  valueColor: string;
}> {
  if (colors.length === 0) return {};

  // Sort by luminance (dark to light)
  const sorted = [...colors].sort((a, b) => getLuminance(a) - getLuminance(b));

  const result: Record<string, string> = {};

  if (sorted.length >= 5) {
    result.backgroundColor = sorted[0];
    result.primaryColor = sorted[1];
    result.secondaryColor = sorted[2];
    result.accentColor = sorted[3];
    result.textColor = sorted[4];
    result.valueColor = sorted[4];
  } else if (sorted.length === 4) {
    result.backgroundColor = sorted[0];
    result.primaryColor = sorted[1];
    result.secondaryColor = sorted[2];
    result.accentColor = sorted[3];
    result.textColor = '#ffffff';
    result.valueColor = '#ffffff';
  } else if (sorted.length === 3) {
    result.backgroundColor = sorted[0];
    result.primaryColor = sorted[1];
    result.accentColor = sorted[2];
    result.secondaryColor = sorted[1];
    result.textColor = '#ffffff';
    result.valueColor = '#ffffff';
  } else if (sorted.length === 2) {
    result.backgroundColor = sorted[0];
    result.primaryColor = sorted[1];
    result.secondaryColor = sorted[1];
    result.accentColor = sorted[1];
    result.textColor = '#ffffff';
    result.valueColor = '#ffffff';
  } else {
    result.primaryColor = sorted[0];
    result.secondaryColor = sorted[0];
    result.accentColor = sorted[0];
  }

  return result;
}
