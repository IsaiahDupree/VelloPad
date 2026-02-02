'use client';

import { EditorContent, Editor } from '@tiptap/react';
import {
  LayoutConfig,
  TrimSize,
  getPageDimensions,
  getContentArea,
  inchesToPixels,
} from './types';
import { cn } from '@/lib/utils';

interface PageCanvasProps {
  editor: Editor;
  trimSize: TrimSize;
  layoutConfig: LayoutConfig;
  showGuides?: boolean;
  scale?: number;
}

export function PageCanvas({
  editor,
  trimSize,
  layoutConfig,
  showGuides = true,
  scale = 0.7,
}: PageCanvasProps) {
  const pageDims = getPageDimensions(trimSize, scale);
  const contentArea = getContentArea(trimSize, layoutConfig.margins, scale);

  // Calculate header/footer heights
  const headerHeight = layoutConfig.header.enabled
    ? inchesToPixels(layoutConfig.header.height, 96) * scale
    : 0;
  const footerHeight = layoutConfig.footer.enabled
    ? inchesToPixels(layoutConfig.footer.height, 96) * scale
    : 0;

  return (
    <div className="flex justify-center py-8 px-4 bg-gray-100 min-h-full">
      {/* Page Shadow Container */}
      <div className="relative" style={{ width: pageDims.width, height: pageDims.height }}>
        {/* Page */}
        <div
          className="bg-white shadow-lg relative"
          style={{
            width: pageDims.width,
            height: pageDims.height,
          }}
        >
          {/* Margin Guides */}
          {showGuides && (
            <>
              {/* Top margin guide */}
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400"
                style={{ top: contentArea.marginTop }}
              />
              {/* Bottom margin guide */}
              <div
                className="absolute left-0 right-0 border-b-2 border-dashed border-blue-400"
                style={{ bottom: contentArea.marginBottom }}
              />
              {/* Inside margin guide (left for odd pages) */}
              <div
                className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-400"
                style={{ left: contentArea.marginInside }}
              />
              {/* Outside margin guide (right for odd pages) */}
              <div
                className="absolute top-0 bottom-0 border-r-2 border-dashed border-blue-400"
                style={{ right: contentArea.marginOutside }}
              />
              {/* Safe zone label */}
              <div
                className="absolute text-xs text-blue-600 font-medium"
                style={{
                  top: contentArea.marginTop + 4,
                  left: contentArea.marginInside + 4,
                }}
              >
                Safe Zone
              </div>
            </>
          )}

          {/* Content Container */}
          <div
            className="absolute"
            style={{
              top: contentArea.marginTop,
              bottom: contentArea.marginBottom,
              left: contentArea.marginInside,
              right: contentArea.marginOutside,
            }}
          >
            {/* Header */}
            {layoutConfig.header.enabled && (
              <div
                className={cn(
                  'border-b border-gray-200 flex items-center px-2 text-sm text-gray-600',
                  layoutConfig.header.style === 'centered' && 'justify-center',
                  layoutConfig.header.style === 'running-head' && 'justify-between'
                )}
                style={{ height: headerHeight }}
              >
                {layoutConfig.header.content || 'Header'}
              </div>
            )}

            {/* Main Content Area */}
            <div
              className="overflow-hidden"
              style={{
                height:
                  contentArea.height - headerHeight - footerHeight - (showGuides ? 8 : 0),
                fontSize: `${layoutConfig.fontSize * scale}pt`,
                lineHeight: layoutConfig.lineSpacing,
              }}
            >
              <EditorContent
                editor={editor}
                className={cn(
                  'h-full prose max-w-none',
                  'prose-headings:font-bold',
                  'prose-p:my-2',
                  'focus:outline-none'
                )}
              />
            </div>

            {/* Footer */}
            {layoutConfig.footer.enabled && (
              <div
                className={cn(
                  'border-t border-gray-200 flex items-center px-2 text-sm text-gray-600',
                  layoutConfig.footer.style === 'centered' && 'justify-center',
                  layoutConfig.footer.style === 'running-foot' && 'justify-between'
                )}
                style={{ height: footerHeight }}
              >
                {layoutConfig.footer.content || 'Footer'}
              </div>
            )}

            {/* Page Number */}
            {layoutConfig.pageNumbers.enabled && (
              <div
                className={cn(
                  'absolute text-sm text-gray-600',
                  layoutConfig.pageNumbers.position === 'top-left' &&
                    'top-2 left-2',
                  layoutConfig.pageNumbers.position === 'top-center' &&
                    'top-2 left-1/2 -translate-x-1/2',
                  layoutConfig.pageNumbers.position === 'top-right' &&
                    'top-2 right-2',
                  layoutConfig.pageNumbers.position === 'bottom-left' &&
                    'bottom-2 left-2',
                  layoutConfig.pageNumbers.position === 'bottom-center' &&
                    'bottom-2 left-1/2 -translate-x-1/2',
                  layoutConfig.pageNumbers.position === 'bottom-right' &&
                    'bottom-2 right-2'
                )}
              >
                1
              </div>
            )}
          </div>
        </div>

        {/* Page Info Overlay */}
        {showGuides && (
          <div className="absolute -top-6 left-0 text-xs text-gray-500">
            {trimSize} | {Math.round(scale * 100)}% scale
          </div>
        )}
      </div>
    </div>
  );
}
