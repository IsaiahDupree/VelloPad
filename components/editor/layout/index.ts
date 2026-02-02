// UI-003: Editor Layout Mode Exports

export { PageCanvas } from './page-canvas';
export { LayoutSettingsPanel } from './layout-settings-panel';
export { LayoutModeEditor } from './layout-mode-editor';
export {
  type LayoutConfig,
  type LayoutMargins,
  type HeaderConfig,
  type FooterConfig,
  type PageNumberConfig,
  type PageNumberPosition,
  type PageNumberFormat,
  type TrimSize,
  type TrimDimensions,
  DEFAULT_LAYOUT_CONFIG,
  TRIM_DIMENSIONS,
  inchesToPixels,
  pixelsToInches,
  getPageDimensions,
  getContentArea,
} from './types';
