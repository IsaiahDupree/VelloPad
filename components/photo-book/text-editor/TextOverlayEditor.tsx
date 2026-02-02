/**
 * Photo Book Text Overlay Editor
 * Add captions, dates, and quotes to photo book pages
 *
 * @see PB-021: Text Overlay Editor
 */

'use client'

import { useState, useCallback } from 'react'
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Plus,
  Trash2,
  Move,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/**
 * Text overlay element
 */
export interface TextOverlay {
  id: string
  type: 'caption' | 'date' | 'quote' | 'custom'
  text: string
  x: number // 0-1 normalized position
  y: number // 0-1 normalized position
  width: number // 0-1 normalized width
  fontSize: number // points
  fontFamily: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string // hex color
  backgroundColor?: string // hex color (optional)
  rotation: number // degrees
  zIndex: number
}

/**
 * Page with text overlays
 */
export interface PageWithText {
  pageNumber: number
  textOverlays: TextOverlay[]
  backgroundImageUrl?: string
}

/**
 * Text overlay editor props
 */
export interface TextOverlayEditorProps {
  page: PageWithText
  onPageChange: (page: PageWithText) => void
  pageWidth?: number
  pageHeight?: number
  className?: string
}

export function TextOverlayEditor({
  page,
  onPageChange,
  pageWidth = 800,
  pageHeight = 1000,
  className,
}: TextOverlayEditorProps) {
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null)
  const [draggedOverlay, setDraggedOverlay] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  /**
   * Add a new text overlay
   */
  const addTextOverlay = useCallback(
    (type: TextOverlay['type']) => {
      const newOverlay: TextOverlay = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        text:
          type === 'caption'
            ? 'Enter caption...'
            : type === 'date'
              ? new Date().toLocaleDateString()
              : type === 'quote'
                ? '"Enter quote..."'
                : 'Enter text...',
        x: 0.1,
        y: 0.1,
        width: 0.8,
        fontSize: type === 'quote' ? 24 : 16,
        fontFamily: type === 'quote' ? 'serif' : 'sans-serif',
        fontWeight: 'normal',
        fontStyle: type === 'quote' ? 'italic' : 'normal',
        textAlign: 'center',
        color: '#000000',
        backgroundColor: undefined,
        rotation: 0,
        zIndex: page.textOverlays.length + 1,
      }

      onPageChange({
        ...page,
        textOverlays: [...page.textOverlays, newOverlay],
      })

      setSelectedOverlay(newOverlay.id)
    },
    [page, onPageChange]
  )

  /**
   * Update text overlay
   */
  const updateOverlay = useCallback(
    (overlayId: string, updates: Partial<TextOverlay>) => {
      const updatedOverlays = page.textOverlays.map((overlay) =>
        overlay.id === overlayId ? { ...overlay, ...updates } : overlay
      )

      onPageChange({
        ...page,
        textOverlays: updatedOverlays,
      })
    },
    [page, onPageChange]
  )

  /**
   * Delete text overlay
   */
  const deleteOverlay = useCallback(
    (overlayId: string) => {
      const updatedOverlays = page.textOverlays.filter((overlay) => overlay.id !== overlayId)

      onPageChange({
        ...page,
        textOverlays: updatedOverlays,
      })

      if (selectedOverlay === overlayId) {
        setSelectedOverlay(null)
      }
    },
    [page, selectedOverlay, onPageChange]
  )

  /**
   * Handle mouse down on overlay
   */
  const handleMouseDown = useCallback(
    (overlayId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedOverlay(overlayId)
      setDraggedOverlay(overlayId)
      setDragStart({
        x: e.clientX,
        y: e.clientY,
      })
    },
    []
  )

  /**
   * Handle mouse move (dragging)
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedOverlay || !dragStart) return

      const overlay = page.textOverlays.find((o) => o.id === draggedOverlay)
      if (!overlay) return

      const deltaX = (e.clientX - dragStart.x) / pageWidth
      const deltaY = (e.clientY - dragStart.y) / pageHeight

      updateOverlay(draggedOverlay, {
        x: Math.max(0, Math.min(1 - overlay.width, overlay.x + deltaX)),
        y: Math.max(0, Math.min(1, overlay.y + deltaY)),
      })

      setDragStart({
        x: e.clientX,
        y: e.clientY,
      })
    },
    [draggedOverlay, dragStart, page.textOverlays, pageWidth, pageHeight, updateOverlay]
  )

  /**
   * Handle mouse up (stop dragging)
   */
  const handleMouseUp = useCallback(() => {
    setDraggedOverlay(null)
    setDragStart(null)
  }, [])

  const selectedOverlayData = selectedOverlay
    ? page.textOverlays.find((o) => o.id === selectedOverlay)
    : null

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6', className)}>
      {/* Canvas */}
      <div className="lg:col-span-2">
        <div
          className="relative border rounded-lg overflow-hidden shadow-lg"
          style={{ width: pageWidth, height: pageHeight }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Background image */}
          {page.backgroundImageUrl && (
            <img
              src={page.backgroundImageUrl}
              alt="Page background"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Text overlays */}
          {page.textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className={cn(
                'absolute cursor-move',
                selectedOverlay === overlay.id && 'ring-2 ring-primary ring-offset-2'
              )}
              style={{
                left: `${overlay.x * 100}%`,
                top: `${overlay.y * 100}%`,
                width: `${overlay.width * 100}%`,
                fontSize: `${overlay.fontSize}px`,
                fontFamily: overlay.fontFamily,
                fontWeight: overlay.fontWeight,
                fontStyle: overlay.fontStyle,
                textAlign: overlay.textAlign,
                color: overlay.color,
                backgroundColor: overlay.backgroundColor,
                transform: `rotate(${overlay.rotation}deg)`,
                zIndex: overlay.zIndex,
              }}
              onMouseDown={(e) => handleMouseDown(overlay.id, e)}
            >
              <p className="select-none pointer-events-none">{overlay.text}</p>

              {/* Selection indicator */}
              {selectedOverlay === overlay.id && (
                <div className="absolute -top-8 left-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  {overlay.type}
                </div>
              )}
            </div>
          ))}

          {/* Instructions overlay */}
          {page.textOverlays.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <div className="text-center space-y-2">
                <Type className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Click "Add Caption" to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Panel */}
      <div className="space-y-4">
        {/* Add text buttons */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Button onClick={() => addTextOverlay('caption')} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Caption
            </Button>
            <Button onClick={() => addTextOverlay('date')} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Date
            </Button>
            <Button onClick={() => addTextOverlay('quote')} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Quote
            </Button>
            <Button onClick={() => addTextOverlay('custom')} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Text
            </Button>
          </CardContent>
        </Card>

        {/* Edit selected overlay */}
        {selectedOverlayData && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Edit Text</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteOverlay(selectedOverlayData.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Tabs defaultValue="content">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  {/* Text content */}
                  <div className="space-y-2">
                    <Label htmlFor="text">Text</Label>
                    <Textarea
                      id="text"
                      value={selectedOverlayData.text}
                      onChange={(e) => updateOverlay(selectedOverlayData.id, { text: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={selectedOverlayData.type}
                      onValueChange={(value) =>
                        updateOverlay(selectedOverlayData.id, {
                          type: value as TextOverlay['type'],
                        })
                      }
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="caption">Caption</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="quote">Quote</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="space-y-4">
                  {/* Font family */}
                  <div className="space-y-2">
                    <Label htmlFor="fontFamily">Font</Label>
                    <Select
                      value={selectedOverlayData.fontFamily}
                      onValueChange={(value) =>
                        updateOverlay(selectedOverlayData.id, { fontFamily: value })
                      }
                    >
                      <SelectTrigger id="fontFamily">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sans-serif">Sans Serif</SelectItem>
                        <SelectItem value="serif">Serif</SelectItem>
                        <SelectItem value="monospace">Monospace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font size */}
                  <div className="space-y-2">
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Input
                      id="fontSize"
                      type="number"
                      value={selectedOverlayData.fontSize}
                      onChange={(e) =>
                        updateOverlay(selectedOverlayData.id, {
                          fontSize: parseInt(e.target.value),
                        })
                      }
                      min={8}
                      max={72}
                    />
                  </div>

                  {/* Text alignment */}
                  <div className="space-y-2">
                    <Label>Alignment</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={selectedOverlayData.textAlign === 'left' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateOverlay(selectedOverlayData.id, { textAlign: 'left' })}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedOverlayData.textAlign === 'center' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateOverlay(selectedOverlayData.id, { textAlign: 'center' })}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedOverlayData.textAlign === 'right' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateOverlay(selectedOverlayData.id, { textAlign: 'right' })}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Font style */}
                  <div className="space-y-2">
                    <Label>Style</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={selectedOverlayData.fontWeight === 'bold' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          updateOverlay(selectedOverlayData.id, {
                            fontWeight: selectedOverlayData.fontWeight === 'bold' ? 'normal' : 'bold',
                          })
                        }
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedOverlayData.fontStyle === 'italic' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          updateOverlay(selectedOverlayData.id, {
                            fontStyle:
                              selectedOverlayData.fontStyle === 'italic' ? 'normal' : 'italic',
                          })
                        }
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <Label htmlFor="color">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={selectedOverlayData.color}
                        onChange={(e) => updateOverlay(selectedOverlayData.id, { color: e.target.value })}
                        className="h-10 w-20"
                      />
                      <Input
                        type="text"
                        value={selectedOverlayData.color}
                        onChange={(e) => updateOverlay(selectedOverlayData.id, { color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!selectedOverlayData && page.textOverlays.length > 0 && (
          <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
            <Move className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Select a text element to edit</p>
          </div>
        )}
      </div>
    </div>
  )
}
