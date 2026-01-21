'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { CoverDesign } from '@/lib/cover'

interface CoverDesignerProps {
  bookId: string
  initialDesign: CoverDesign
}

const AVAILABLE_FONTS = [
  'Georgia', 'Garamond', 'Times New Roman', 'Palatino', 'Baskerville',
  'Bodoni', 'Didot', 'Caslon', 'Century', 'Bookman',
  'Arial', 'Helvetica', 'Futura', 'Gill Sans', 'Optima'
]

const LAYOUTS = [
  { value: 'centered', label: 'Centered' },
  { value: 'top-aligned', label: 'Top Aligned' },
  { value: 'bottom-aligned', label: 'Bottom Aligned' },
  { value: 'split', label: 'Split Layout' }
]

export function CoverDesigner({ bookId, initialDesign }: CoverDesignerProps) {
  const [design, setDesign] = useState<CoverDesign>(initialDesign)
  const [saving, setSaving] = useState(false)
  const [showSafeZones, setShowSafeZones] = useState(true)

  useEffect(() => {
    setDesign(initialDesign)
  }, [initialDesign])

  async function handleSave() {
    try {
      setSaving(true)
      const response = await fetch(`/api/books/${bookId}/cover`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(design)
      })

      if (!response.ok) throw new Error('Failed to save cover design')
    } catch (error) {
      console.error('Failed to save cover design:', error)
      alert('Failed to save cover design')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Cover Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Preview</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSafeZones(!showSafeZones)}
          >
            {showSafeZones ? 'Hide' : 'Show'} Safe Zones
          </Button>
        </div>

        <div className="relative aspect-[2/3] border rounded-lg overflow-hidden shadow-lg">
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: design.backgroundColor,
              backgroundImage: design.backgroundImageId ? `url(/api/assets/${design.backgroundImageId})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />

          {/* Safe zones overlay */}
          {showSafeZones && (
            <>
              {/* Bleed line (outer edge) */}
              <div className="absolute inset-0 border-2 border-red-500 border-dashed opacity-50" />
              {/* Safe area (inner) */}
              <div className="absolute inset-[10%] border-2 border-green-500 border-dashed opacity-50" />
            </>
          )}

          {/* Content */}
          <div
            className={`absolute inset-0 flex flex-col p-8 ${
              design.layout === 'centered' ? 'justify-center items-center text-center' :
              design.layout === 'top-aligned' ? 'justify-start items-center text-center' :
              design.layout === 'bottom-aligned' ? 'justify-end items-center text-center' :
              'justify-between items-center text-center'
            }`}
          >
            <div className="space-y-4 w-full px-4">
              {/* Title */}
              <h1
                style={{
                  fontFamily: design.titleFont.family,
                  fontSize: `${design.titleFont.size * 0.5}px`,
                  color: design.titleFont.color,
                  fontWeight: 700,
                  lineHeight: 1.2
                }}
              >
                {design.title || 'Book Title'}
              </h1>

              {/* Subtitle */}
              {design.subtitle && (
                <h2
                  style={{
                    fontFamily: design.subtitleFont.family,
                    fontSize: `${design.subtitleFont.size * 0.5}px`,
                    color: design.subtitleFont.color,
                    fontWeight: 400,
                    lineHeight: 1.3
                  }}
                >
                  {design.subtitle}
                </h2>
              )}

              {/* Author */}
              {design.author && (
                <p
                  style={{
                    fontFamily: design.authorFont.family,
                    fontSize: `${design.authorFont.size * 0.5}px`,
                    color: design.authorFont.color,
                    fontWeight: 400,
                    marginTop: design.layout === 'split' ? 'auto' : undefined
                  }}
                >
                  {design.author}
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {showSafeZones && (
            <>
              <span className="text-red-500">Red dashed line</span> = Bleed edge (will be trimmed) •{' '}
              <span className="text-green-500">Green dashed line</span> = Safe area (keep text inside)
            </>
          )}
        </p>
      </div>

      {/* Design Controls */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Layout</CardTitle>
            <CardDescription>Choose how elements are arranged on the cover</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Layout Style</Label>
              <Select
                value={design.layout}
                onValueChange={(value) => setDesign({ ...design, layout: value as CoverDesign['layout'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUTS.map(layout => (
                    <SelectItem key={layout.value} value={layout.value}>
                      {layout.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bg-color">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={design.backgroundColor}
                  onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={design.backgroundColor}
                  onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Font Family</Label>
              <Select
                value={design.titleFont.family}
                onValueChange={(value) => setDesign({
                  ...design,
                  titleFont: { ...design.titleFont, family: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FONTS.map(font => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title-size">Font Size: {design.titleFont.size}px</Label>
              <Input
                id="title-size"
                type="range"
                min="24"
                max="120"
                value={design.titleFont.size}
                onChange={(e) => setDesign({
                  ...design,
                  titleFont: { ...design.titleFont, size: parseInt(e.target.value) }
                })}
              />
            </div>

            <div>
              <Label htmlFor="title-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="title-color"
                  type="color"
                  value={design.titleFont.color}
                  onChange={(e) => setDesign({
                    ...design,
                    titleFont: { ...design.titleFont, color: e.target.value }
                  })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={design.titleFont.color}
                  onChange={(e) => setDesign({
                    ...design,
                    titleFont: { ...design.titleFont, color: e.target.value }
                  })}
                  placeholder="#000000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subtitle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Font Family</Label>
              <Select
                value={design.subtitleFont.family}
                onValueChange={(value) => setDesign({
                  ...design,
                  subtitleFont: { ...design.subtitleFont, family: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FONTS.map(font => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subtitle-size">Font Size: {design.subtitleFont.size}px</Label>
              <Input
                id="subtitle-size"
                type="range"
                min="14"
                max="72"
                value={design.subtitleFont.size}
                onChange={(e) => setDesign({
                  ...design,
                  subtitleFont: { ...design.subtitleFont, size: parseInt(e.target.value) }
                })}
              />
            </div>

            <div>
              <Label htmlFor="subtitle-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="subtitle-color"
                  type="color"
                  value={design.subtitleFont.color}
                  onChange={(e) => setDesign({
                    ...design,
                    subtitleFont: { ...design.subtitleFont, color: e.target.value }
                  })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={design.subtitleFont.color}
                  onChange={(e) => setDesign({
                    ...design,
                    subtitleFont: { ...design.subtitleFont, color: e.target.value }
                  })}
                  placeholder="#333333"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Author</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Font Family</Label>
              <Select
                value={design.authorFont.family}
                onValueChange={(value) => setDesign({
                  ...design,
                  authorFont: { ...design.authorFont, family: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FONTS.map(font => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="author-size">Font Size: {design.authorFont.size}px</Label>
              <Input
                id="author-size"
                type="range"
                min="12"
                max="48"
                value={design.authorFont.size}
                onChange={(e) => setDesign({
                  ...design,
                  authorFont: { ...design.authorFont, size: parseInt(e.target.value) }
                })}
              />
            </div>

            <div>
              <Label htmlFor="author-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="author-color"
                  type="color"
                  value={design.authorFont.color}
                  onChange={(e) => setDesign({
                    ...design,
                    authorFont: { ...design.authorFont, color: e.target.value }
                  })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={design.authorFont.color}
                  onChange={(e) => setDesign({
                    ...design,
                    authorFont: { ...design.authorFont, color: e.target.value }
                  })}
                  placeholder="#666666"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? 'Saving...' : 'Save Cover Design'}
        </Button>
      </div>
    </div>
  )
}
