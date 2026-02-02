/**
 * Photo Book Page Sorter
 * Drag-and-drop page reordering in photo book
 *
 * @see PB-020: Page Reordering
 */

'use client'

import { useState, useCallback } from 'react'
import { GripVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Page in a photo book
 */
export interface PhotoBookPage {
  id: string
  pageNumber: number
  thumbnailUrl?: string
  title?: string
}

/**
 * Page sorter props
 */
export interface PageSorterProps {
  pages: PhotoBookPage[]
  onReorder: (pages: PhotoBookPage[]) => void
  className?: string
}

export function PageSorter({ pages, onReorder, className }: PageSorterProps) {
  const [draggedPage, setDraggedPage] = useState<string | null>(null)
  const [draggedOverPage, setDraggedOverPage] = useState<string | null>(null)

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((pageId: string, e: React.DragEvent) => {
    setDraggedPage(pageId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
  }, [])

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((pageId: string, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggedOverPage(pageId)
  }, [])

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback(() => {
    setDraggedOverPage(null)
  }, [])

  /**
   * Handle drop
   */
  const handleDrop = useCallback(
    (targetPageId: string, e: React.DragEvent) => {
      e.preventDefault()

      if (!draggedPage || draggedPage === targetPageId) {
        setDraggedPage(null)
        setDraggedOverPage(null)
        return
      }

      // Find indices
      const draggedIndex = pages.findIndex((p) => p.id === draggedPage)
      const targetIndex = pages.findIndex((p) => p.id === targetPageId)

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedPage(null)
        setDraggedOverPage(null)
        return
      }

      // Reorder pages
      const reorderedPages = [...pages]
      const [draggedItem] = reorderedPages.splice(draggedIndex, 1)
      reorderedPages.splice(targetIndex, 0, draggedItem)

      // Update page numbers
      const updatedPages = reorderedPages.map((page, index) => ({
        ...page,
        pageNumber: index + 1,
      }))

      onReorder(updatedPages)

      setDraggedPage(null)
      setDraggedOverPage(null)
    },
    [draggedPage, pages, onReorder]
  )

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    setDraggedPage(null)
    setDraggedOverPage(null)
  }, [])

  /**
   * Move page up (keyboard/button alternative)
   */
  const movePageUp = useCallback(
    (pageId: string) => {
      const index = pages.findIndex((p) => p.id === pageId)
      if (index <= 0) return

      const reorderedPages = [...pages]
      ;[reorderedPages[index - 1], reorderedPages[index]] = [
        reorderedPages[index],
        reorderedPages[index - 1],
      ]

      // Update page numbers
      const updatedPages = reorderedPages.map((page, idx) => ({
        ...page,
        pageNumber: idx + 1,
      }))

      onReorder(updatedPages)
    },
    [pages, onReorder]
  )

  /**
   * Move page down (keyboard/button alternative)
   */
  const movePageDown = useCallback(
    (pageId: string) => {
      const index = pages.findIndex((p) => p.id === pageId)
      if (index === -1 || index >= pages.length - 1) return

      const reorderedPages = [...pages]
      ;[reorderedPages[index], reorderedPages[index + 1]] = [
        reorderedPages[index + 1],
        reorderedPages[index],
      ]

      // Update page numbers
      const updatedPages = reorderedPages.map((page, idx) => ({
        ...page,
        pageNumber: idx + 1,
      }))

      onReorder(updatedPages)
    },
    [pages, onReorder]
  )

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Page Order</h3>
        <p className="text-sm text-muted-foreground">{pages.length} pages</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {pages.map((page, index) => (
          <Card
            key={page.id}
            draggable
            onDragStart={(e) => handleDragStart(page.id, e)}
            onDragOver={(e) => handleDragOver(page.id, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(page.id, e)}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative cursor-move transition-all',
              'hover:shadow-lg hover:scale-105',
              draggedPage === page.id && 'opacity-50',
              draggedOverPage === page.id && 'ring-2 ring-primary ring-offset-2'
            )}
          >
            <div className="aspect-[3/4] relative">
              {/* Thumbnail or placeholder */}
              {page.thumbnailUrl ? (
                <img
                  src={page.thumbnailUrl}
                  alt={`Page ${page.pageNumber}`}
                  className="w-full h-full object-cover rounded-t"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center rounded-t">
                  <span className="text-4xl font-bold text-muted-foreground">
                    {page.pageNumber}
                  </span>
                </div>
              )}

              {/* Drag handle */}
              <div className="absolute top-2 right-2 bg-background/80 rounded p-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Page {page.pageNumber}</span>
                {page.title && (
                  <span className="text-xs text-muted-foreground truncate ml-2">
                    {page.title}
                  </span>
                )}
              </div>

              {/* Reorder buttons */}
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => movePageUp(page.id)}
                  disabled={index === 0}
                  className="flex-1 h-7 text-xs"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Up
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => movePageDown(page.id)}
                  disabled={index === pages.length - 1}
                  className="flex-1 h-7 text-xs"
                >
                  Down
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p>Drag and drop pages to reorder, or use the Up/Down buttons</p>
      </div>
    </div>
  )
}
