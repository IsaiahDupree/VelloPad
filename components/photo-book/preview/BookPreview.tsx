/**
 * Photo Book Preview Component
 * Flip-through preview of photo book pages before ordering
 *
 * @see PB-017: Preview Mode
 */

'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PreviewPage {
  pageNumber: number
  imageUrl: string
  thumbnailUrl?: string
  type: 'cover-front' | 'cover-back' | 'content'
}

export interface BookPreviewProps {
  pages: PreviewPage[]
  currentPage?: number
  onClose?: () => void
  className?: string
}

export function BookPreview({
  pages,
  currentPage = 0,
  onClose,
  className
}: BookPreviewProps) {
  const [page, setPage] = useState(currentPage)
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const totalPages = pages.length

  const goToPage = (pageNum: number) => {
    if (pageNum >= 0 && pageNum < totalPages) {
      setPage(pageNum)
    }
  }

  const nextPage = () => goToPage(page + 1)
  const prevPage = () => goToPage(page - 1)
  const zoomIn = () => setZoom(Math.min(zoom + 0.25, 3))
  const zoomOut = () => setZoom(Math.max(zoom - 0.25, 0.5))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prevPage()
    if (e.key === 'ArrowRight') nextPage()
    if (e.key === 'Escape') onClose?.()
  }

  const currentPageData = pages[page]

  return (
    <div
      className={cn(
        'relative flex flex-col bg-gray-900 text-white',
        isFullscreen ? 'fixed inset-0 z-50' : 'h-screen',
        className
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Photo Book Preview</h2>
          <span className="text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={zoom <= 0.5}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-400 w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={zoom >= 3}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Close */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main preview area */}
      <div className="relative flex-1 overflow-hidden bg-gray-800">
        <div className="flex h-full items-center justify-center p-8">
          {currentPageData && (
            <div
              className="transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            >
              <img
                src={currentPageData.imageUrl}
                alt={`Page ${page + 1}`}
                className="max-h-[70vh] w-auto rounded-lg shadow-2xl"
                data-testid="preview-page-image"
              />
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="lg"
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
          onClick={prevPage}
          disabled={page === 0}
          aria-label="Previous page"
          data-testid="prev-page-button"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
          onClick={nextPage}
          disabled={page === totalPages - 1}
          aria-label="Next page"
          data-testid="next-page-button"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Thumbnail strip */}
      <div className="border-t border-gray-700 bg-gray-900 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {pages.map((p, idx) => (
            <button
              key={idx}
              onClick={() => goToPage(idx)}
              className={cn(
                'flex-shrink-0 rounded border-2 transition-all',
                idx === page
                  ? 'border-blue-500 ring-2 ring-blue-500/50'
                  : 'border-transparent hover:border-gray-500'
              )}
              aria-label={`Go to page ${idx + 1}`}
              data-testid={`thumbnail-${idx}`}
            >
              <img
                src={p.thumbnailUrl || p.imageUrl}
                alt={`Page ${idx + 1} thumbnail`}
                className="h-20 w-20 object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Page counter for accessibility */}
      <div className="sr-only" role="status" aria-live="polite">
        Viewing page {page + 1} of {totalPages}
      </div>
    </div>
  )
}
