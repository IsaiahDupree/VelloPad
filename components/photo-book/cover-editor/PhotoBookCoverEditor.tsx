/**
 * Photo Book Cover Editor
 * Customizable cover design for photo books
 *
 * @see PB-009: Cover Design Editor
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Image as ImageIcon, Type, Layout, Palette, Save } from 'lucide-react'

export interface PhotoBookCoverDesign {
  title: string
  subtitle?: string
  author?: string
  coverPhotoId: string | null
  coverPhotoUrl?: string
  layout: 'full-bleed' | 'framed' | 'top-image' | 'bottom-image'
  textColor: string
  overlayOpacity: number // 0-100
  overlayColor: string
  titleFont: {
    family: string
    size: number
    weight: number
  }
  subtitleFont: {
    family: string
    size: number
  }
  textPosition: 'center' | 'top' | 'bottom'
}

interface PhotoBookCoverEditorProps {
  projectId: string
  initialDesign?: Partial<PhotoBookCoverDesign>
  availablePhotos: Array<{
    id: string
    url: string
    width: number
    height: number
  }>
  onSave: (design: PhotoBookCoverDesign) => Promise<void>
}

const DEFAULT_DESIGN: PhotoBookCoverDesign = {
  title: 'My Photo Book',
  subtitle: '',
  author: '',
  coverPhotoId: null,
  layout: 'full-bleed',
  textColor: '#FFFFFF',
  overlayOpacity: 40,
  overlayColor: '#000000',
  titleFont: {
    family: 'Georgia',
    size: 48,
    weight: 700
  },
  subtitleFont: {
    family: 'Georgia',
    size: 24
  },
  textPosition: 'center'
}

const FONTS = [
  'Georgia',
  'Times New Roman',
  'Garamond',
  'Arial',
  'Helvetica',
  'Futura',
  'Gill Sans'
]

const LAYOUTS = [
  { id: 'full-bleed', name: 'Full Bleed', desc: 'Photo covers entire front' },
  { id: 'framed', name: 'Framed', desc: 'Photo with border' },
  { id: 'top-image', name: 'Top Image', desc: 'Photo at top, text below' },
  { id: 'bottom-image', name: 'Bottom Image', desc: 'Text at top, photo below' }
]

export function PhotoBookCoverEditor({
  projectId,
  initialDesign,
  availablePhotos,
  onSave
}: PhotoBookCoverEditorProps) {
  const [design, setDesign] = useState<PhotoBookCoverDesign>({
    ...DEFAULT_DESIGN,
    ...initialDesign
  })
  const [saving, setSaving] = useState(false)
  const [showSafeZones, setShowSafeZones] = useState(true)

  const selectedPhoto = availablePhotos.find(p => p.id === design.coverPhotoId)

  const handleSave = async () => {
    if (!design.coverPhotoId) {
      alert('Please select a cover photo')
      return
    }

    if (!design.title.trim()) {
      alert('Please enter a title')
      return
    }

    try {
      setSaving(true)
      await onSave(design)
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
      <div className="space-y-4 sticky top-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Cover Preview</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSafeZones(!showSafeZones)}
          >
            {showSafeZones ? 'Hide' : 'Show'} Safe Zones
          </Button>
        </div>

        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-xl">
          {/* Background Photo */}
          {selectedPhoto ? (
            <div
              className={`absolute inset-0 ${
                design.layout === 'full-bleed' ? '' :
                design.layout === 'framed' ? 'inset-4' :
                design.layout === 'top-image' ? 'bottom-1/2' :
                'top-1/2'
              }`}
            >
              <Image
                src={selectedPhoto.url}
                alt="Cover photo"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p>No photo selected</p>
              </div>
            </div>
          )}

          {/* Text Overlay */}
          {selectedPhoto && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: design.overlayColor,
                opacity: design.overlayOpacity / 100
              }}
            />
          )}

          {/* Safe Zones */}
          {showSafeZones && (
            <>
              {/* Bleed (3mm ≈ 5% on each side) */}
              <div className="absolute inset-0 border-2 border-red-500 border-dashed pointer-events-none" />
              {/* Safe zone (6mm from bleed ≈ 8% on each side) */}
              <div className="absolute inset-[8%] border-2 border-green-500 border-dashed pointer-events-none" />
            </>
          )}

          {/* Text Content */}
          <div
            className={`absolute inset-[10%] flex flex-col z-10 ${
              design.textPosition === 'center' ? 'justify-center' :
              design.textPosition === 'top' ? 'justify-start' :
              'justify-end'
            } items-center text-center`}
          >
            {/* Title */}
            <h1
              style={{
                fontFamily: design.titleFont.family,
                fontSize: `${design.titleFont.size}px`,
                fontWeight: design.titleFont.weight,
                color: design.textColor,
                lineHeight: 1.1,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                wordWrap: 'break-word',
                maxWidth: '100%'
              }}
            >
              {design.title || 'Your Title Here'}
            </h1>

            {/* Subtitle */}
            {design.subtitle && (
              <h2
                className="mt-2"
                style={{
                  fontFamily: design.subtitleFont.family,
                  fontSize: `${design.subtitleFont.size}px`,
                  color: design.textColor,
                  fontWeight: 400,
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              >
                {design.subtitle}
              </h2>
            )}

            {/* Author */}
            {design.author && (
              <p
                className="mt-4"
                style={{
                  fontFamily: design.subtitleFont.family,
                  fontSize: `${design.subtitleFont.size * 0.75}px`,
                  color: design.textColor,
                  fontWeight: 300,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                {design.author}
              </p>
            )}
          </div>
        </div>

        {showSafeZones && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <span className="inline-block w-3 h-3 border-2 border-red-500 border-dashed mr-1" />
              Red = Bleed edge (will be trimmed)
            </p>
            <p>
              <span className="inline-block w-3 h-3 border-2 border-green-500 border-dashed mr-1" />
              Green = Safe area (keep text/important elements inside)
            </p>
          </div>
        )}
      </div>

      {/* Editor Controls */}
      <div className="space-y-6">
        <Tabs defaultValue="content">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">
              <Type className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="photo">
              <ImageIcon className="w-4 h-4 mr-2" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="layout">
              <Layout className="w-4 h-4 mr-2" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="style">
              <Palette className="w-4 h-4 mr-2" />
              Style
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cover Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={design.title}
                    onChange={(e) => setDesign({ ...design, title: e.target.value })}
                    placeholder="My Amazing Photo Book"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {design.title.length}/100 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="subtitle">Subtitle (optional)</Label>
                  <Input
                    id="subtitle"
                    value={design.subtitle}
                    onChange={(e) => setDesign({ ...design, subtitle: e.target.value })}
                    placeholder="A collection of memories"
                    maxLength={150}
                  />
                </div>

                <div>
                  <Label htmlFor="author">Author (optional)</Label>
                  <Input
                    id="author"
                    value={design.author}
                    onChange={(e) => setDesign({ ...design, author: e.target.value })}
                    placeholder="Your Name"
                    maxLength={100}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photo Tab */}
          <TabsContent value="photo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cover Photo</CardTitle>
              </CardHeader>
              <CardContent>
                {availablePhotos.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No photos available. Upload photos first.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availablePhotos.slice(0, 12).map(photo => (
                      <button
                        key={photo.id}
                        onClick={() =>
                          setDesign({
                            ...design,
                            coverPhotoId: photo.id,
                            coverPhotoUrl: photo.url
                          })
                        }
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          design.coverPhotoId === photo.id
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <Image
                          src={photo.url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                        {design.coverPhotoId === photo.id && (
                          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                            <Badge variant="default">Selected</Badge>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Layout Tab */}
          <TabsContent value="layout" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Layout Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {LAYOUTS.map(layout => (
                  <button
                    key={layout.id}
                    onClick={() => setDesign({ ...design, layout: layout.id as any })}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      design.layout === layout.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{layout.name}</div>
                    <div className="text-sm text-muted-foreground">{layout.desc}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Text Position</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={design.textPosition}
                  onValueChange={(value: any) => setDesign({ ...design, textPosition: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Typography</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title Font</Label>
                  <Select
                    value={design.titleFont.family}
                    onValueChange={(value) =>
                      setDesign({
                        ...design,
                        titleFont: { ...design.titleFont, family: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map(font => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Title Size: {design.titleFont.size}px</Label>
                  <Input
                    type="range"
                    min="24"
                    max="96"
                    value={design.titleFont.size}
                    onChange={(e) =>
                      setDesign({
                        ...design,
                        titleFont: { ...design.titleFont, size: parseInt(e.target.value) }
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={design.textColor}
                      onChange={(e) => setDesign({ ...design, textColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={design.textColor}
                      onChange={(e) => setDesign({ ...design, textColor: e.target.value })}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Photo Overlay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Overlay Opacity: {design.overlayOpacity}%</Label>
                  <Input
                    type="range"
                    min="0"
                    max="80"
                    value={design.overlayOpacity}
                    onChange={(e) =>
                      setDesign({ ...design, overlayOpacity: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Add a dark overlay to make text more readable
                  </p>
                </div>

                <div>
                  <Label>Overlay Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={design.overlayColor}
                      onChange={(e) => setDesign({ ...design, overlayColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={design.overlayColor}
                      onChange={(e) => setDesign({ ...design, overlayColor: e.target.value })}
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Cover Design'}
        </Button>
      </div>
    </div>
  )
}
