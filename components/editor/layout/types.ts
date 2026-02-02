// UI-003: Editor Layout Mode Types

export interface LayoutMargins {
  top: number; // inches
  bottom: number; // inches
  inside: number; // inches (left on odd pages, right on even pages)
  outside: number; // inches (right on odd pages, left on even pages)
}

export interface HeaderConfig {
  enabled: boolean;
  height: number; // inches
  content: string;
  style: 'plain' | 'centered' | 'running-head';
}

export interface FooterConfig {
  enabled: boolean;
  height: number; // inches
  content: string;
  style: 'plain' | 'centered' | 'running-foot';
}

export type PageNumberPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type PageNumberFormat =
  | 'decimal' // 1, 2, 3
  | 'roman-lower' // i, ii, iii
  | 'roman-upper' // I, II, III
  | 'letter-lower' // a, b, c
  | 'letter-upper'; // A, B, C

export interface PageNumberConfig {
  enabled: boolean;
  position: PageNumberPosition;
  format: PageNumberFormat;
}

export interface LayoutConfig {
  margins: LayoutMargins;
  header: HeaderConfig;
  footer: FooterConfig;
  pageNumbers: PageNumberConfig;
  lineSpacing: number; // 1.0, 1.5, 2.0, etc.
  fontSize: number; // pt
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  margins: {
    top: 1.0,
    bottom: 1.0,
    inside: 1.0,
    outside: 0.75,
  },
  header: {
    enabled: false,
    height: 0.5,
    content: '',
    style: 'plain',
  },
  footer: {
    enabled: false,
    height: 0.5,
    content: '',
    style: 'plain',
  },
  pageNumbers: {
    enabled: true,
    position: 'bottom-center',
    format: 'decimal',
  },
  lineSpacing: 1.5,
  fontSize: 11,
};

export type TrimSize = '5x8' | '5.5x8.5' | '6x9' | '7x10' | '8x10' | '8.5x11';

export interface TrimDimensions {
  width: number; // inches
  height: number; // inches
}

export const TRIM_DIMENSIONS: Record<TrimSize, TrimDimensions> = {
  '5x8': { width: 5, height: 8 },
  '5.5x8.5': { width: 5.5, height: 8.5 },
  '6x9': { width: 6, height: 9 },
  '7x10': { width: 7, height: 10 },
  '8x10': { width: 8, height: 10 },
  '8.5x11': { width: 8.5, height: 11 },
};

/**
 * Convert inches to pixels at a given DPI
 */
export function inchesToPixels(inches: number, dpi: number = 96): number {
  return Math.round(inches * dpi);
}

/**
 * Convert pixels to inches at a given DPI
 */
export function pixelsToInches(pixels: number, dpi: number = 96): number {
  return pixels / dpi;
}

/**
 * Get page dimensions in pixels for screen display (96 DPI)
 */
export function getPageDimensions(trimSize: TrimSize, scale: number = 1): {
  width: number;
  height: number;
} {
  const dims = TRIM_DIMENSIONS[trimSize];
  return {
    width: inchesToPixels(dims.width, 96) * scale,
    height: inchesToPixels(dims.height, 96) * scale,
  };
}

/**
 * Get content area dimensions (page minus margins)
 */
export function getContentArea(
  trimSize: TrimSize,
  margins: LayoutMargins,
  scale: number = 1
): {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginInside: number;
  marginOutside: number;
} {
  const dims = TRIM_DIMENSIONS[trimSize];
  const contentWidth = dims.width - margins.inside - margins.outside;
  const contentHeight = dims.height - margins.top - margins.bottom;

  return {
    width: inchesToPixels(contentWidth, 96) * scale,
    height: inchesToPixels(contentHeight, 96) * scale,
    marginTop: inchesToPixels(margins.top, 96) * scale,
    marginBottom: inchesToPixels(margins.bottom, 96) * scale,
    marginInside: inchesToPixels(margins.inside, 96) * scale,
    marginOutside: inchesToPixels(margins.outside, 96) * scale,
  };
}
