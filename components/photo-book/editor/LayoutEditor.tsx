/**
 * Photo Book Layout Editor
 * Drag-and-drop editor for adjusting photo positions on pages
 *
 * @see PB-019: Manual Layout Adjustment
 */

'use client'

import { useState, useCallback } from 'react'
import { Move, RotateCw, Maximize2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Photo element on a page
 */
export interface PhotoElement {
  id: string
  photoId: string
  imageUrl: string
  x: number // 0-1 normalized
  y: number // 0-1 normalized
  width: number // 0-1 normalized
  height: number // 0-1 normalized
  rotation: number // degrees
  zIndex: number
}

/**
 * Page layout
 */
export interface PageLayout {
  pageNumber: number
  elements: PhotoElement[]
  backgroundColor?: string
}

/**
 * Layout editor props
 */
export interface LayoutEditorProps {
  layout: PageLayout
  onLayoutChange: (layout: PageLayout) => void
  pageWidth?: number
  pageHeight?: number
  className?: string
}

export function LayoutEditor({
  layout,
  onLayoutChange,
  pageWidth = 800,
  pageHeight = 800,
  className
}: LayoutEditorProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [draggedElement, setDraggedElement] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  /**
   * Update an element
   */
  const updateElement = useCallback(
    (elementId: string, updates: Partial<PhotoElement>) => {
      const updatedElements = layout.elements.map(el =>
        el.id === elementId ? { ...el, ...updates } : el
      )

      onLayoutChange({
        ...layout,
        elements: updatedElements
      })
    },
    [layout, onLayoutChange]
  )

  /**
   * Delete an element
   */
  const deleteElement = useCallback(
    (elementId: string) => {
      const updatedElements = layout.elements.filter(el => el.id !== elementId)
      onLayoutChange({
        ...layout,
        elements: updatedElements
      })
      setSelectedElement(null)
    },
    [layout, onLayoutChange]
  )

  /**
   * Handle mouse down on element
   */
  const handleMouseDown = useCallback(
    (elementId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedElement(elementId)
      setDraggedElement(elementId)
      setDragStart({ x: e.clientX, y: e.clientY })
    },
    []
  )

  /**
   * Handle mouse move for dragging
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedElement || !dragStart) return

      const element = layout.elements.find(el => el.id === draggedElement)
      if (!element) return

      const deltaX = (e.clientX - dragStart.x) / pageWidth
      const deltaY = (e.clientY - dragStart.y) / pageHeight

      updateElement(draggedElement, {
        x: Math.max(0, Math.min(1 - element.width, element.x + deltaX)),
        y: Math.max(0, Math.min(1 - element.height, element.y + deltaY))
      })

      setDragStart({ x: e.clientX, y: e.clientY })
    },
    [draggedElement, dragStart, layout.elements, pageWidth, pageHeight, updateElement]
  )

  /**
   * Handle mouse up to stop dragging
   */
  const handleMouseUp = useCallback(() => {
    setDraggedElement(null)
    setDragStart(null)
  }, [])

  /**
   * Rotate element
   */
  const rotateElement = useCallback(
    (elementId: string) => {
      const element = layout.elements.find(el => el.id === elementId)
      if (!element) return

      updateElement(elementId, {
        rotation: (element.rotation + 90) % 360
      })
    },
    [layout.elements, updateElement]
  )

  /**
   * Bring element to front
   */
  const bringToFront = useCallback(
    (elementId: string) => {
      const maxZ = Math.max(...layout.elements.map(el => el.zIndex), 0)
      updateElement(elementId, { zIndex: maxZ + 1 })
    },
    [layout.elements, updateElement]
  )

  return (
    <div className={cn('relative', className)}>
      {/* Canvas */}
      <div
        className="relative border-2 border-gray-300 bg-white shadow-lg"
        style={{
          width: pageWidth,
          height: pageHeight,
          backgroundColor: layout.backgroundColor || '#ffffff'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Photo elements */}
        {layout.elements.map(element => (
          <div
            key={element.id}
            className={cn(
              'absolute cursor-move transition-shadow',
              selectedElement === element.id
                ? 'ring-2 ring-blue-500 shadow-lg'
                : 'hover:ring-2 hover:ring-gray-400'
            )}
            style={{
              left: `${element.x * 100}%`,
              top: `${element.y * 100}%`,
              width: `${element.width * 100}%`,
              height: `${element.height * 100}%`,
              transform: `rotate(${element.rotation}deg)`,
              zIndex: element.zIndex
            }}
            onMouseDown={e => handleMouseDown(element.id, e)}
            data-testid={`photo-element-${element.id}`}
          >
            <img
              src={element.imageUrl}
              alt="Photo"
              className="h-full w-full object-cover"
              draggable={false}
            />

            {/* Selection controls */}
            {selectedElement === element.id && (
              <div className="absolute -right-2 -top-2 flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={e => {
                    e.stopPropagation()
                    rotateElement(element.id)
                  }}
                  aria-label="Rotate"
                >
                  <RotateCw className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={e => {
                    e.stopPropagation()
                    bringToFront(element.id)
                  }}
                  aria-label="Bring to front"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 w-6 p-0"
                  onClick={e => {
                    e.stopPropagation()
                    deleteElement(element.id)
                  }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {layout.elements.length === 0 && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Move className="mx-auto h-12 w-12 opacity-20" />
              <p className="mt-2">Drag photos here to add them to the page</p>
            </div>
          </div>
        )}
      </div>

      {/* Info panel */}
      {selectedElement && (
        <div className="mt-4 rounded-lg border bg-card p-4 text-sm">
          <h3 className="font-medium">Selected Element</h3>
          <div className="mt-2 space-y-1 text-muted-foreground">
            {(() => {
              const element = layout.elements.find(el => el.id === selectedElement)
              if (!element) return null
              return (
                <>
                  <div>Position: ({(element.x * 100).toFixed(1)}%, {(element.y * 100).toFixed(1)}%)</div>
                  <div>Size: {(element.width * 100).toFixed(1)}% × {(element.height * 100).toFixed(1)}%</div>
                  <div>Rotation: {element.rotation}°</div>
                  <div>Z-index: {element.zIndex}</div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
