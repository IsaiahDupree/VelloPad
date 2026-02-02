/**
 * Brand Kit Manager
 * Feature: PB-038
 *
 * UI for creating, editing, and applying brand kits
 */

'use client'

import { useState } from 'react'
import {
  Palette,
  Type,
  Image as ImageIcon,
  Plus,
  Trash2,
  Check,
  Edit2,
  Download,
  Upload,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BrandKit, BrandColor, BrandFont, BrandLogo } from '@/lib/brand-kit'

/**
 * Brand Kit Manager Props
 */
export interface BrandKitManagerProps {
  brandKits: BrandKit[]
  currentBrandKit?: BrandKit
  onSelect: (brandKit: BrandKit) => void
  onSave: (brandKit: BrandKit) => Promise<void>
  onDelete: (brandKitId: string) => Promise<void>
  onSetDefault: (brandKitId: string) => Promise<void>
  className?: string
}

export function BrandKitManager({
  brandKits,
  currentBrandKit,
  onSelect,
  onSave,
  onDelete,
  onSetDefault,
  className,
}: BrandKitManagerProps) {
  const [editMode, setEditMode] = useState(false)
  const [selectedKit, setSelectedKit] = useState<BrandKit | null>(currentBrandKit || null)

  /**
   * Select and apply brand kit
   */
  const handleSelect = (kit: BrandKit) => {
    setSelectedKit(kit)
    onSelect(kit)
  }

  /**
   * Create new brand kit
   */
  const handleCreate = () => {
    // Open editor with empty brand kit
    setEditMode(true)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Brand Kits</h2>
          <p className="text-sm text-muted-foreground">
            Save and apply your brand colors, fonts, and logos
          </p>
        </div>

        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Brand Kit
        </Button>
      </div>

      {/* Brand Kit List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brandKits.map(kit => (
          <BrandKitCard
            key={kit.id}
            brandKit={kit}
            isSelected={selectedKit?.id === kit.id}
            onSelect={() => handleSelect(kit)}
            onEdit={() => {
              setSelectedKit(kit)
              setEditMode(true)
            }}
            onDelete={() => onDelete(kit.id)}
            onSetDefault={() => onSetDefault(kit.id)}
          />
        ))}

        {brandKits.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Palette className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No brand kits yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first brand kit to maintain consistent branding
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Brand Kit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Brand Kit Editor Dialog */}
      {editMode && (
        <BrandKitEditorDialog
          brandKit={selectedKit}
          open={editMode}
          onOpenChange={setEditMode}
          onSave={async kit => {
            await onSave(kit)
            setEditMode(false)
            setSelectedKit(kit)
          }}
        />
      )}
    </div>
  )
}

/**
 * Brand Kit Card
 */
interface BrandKitCardProps {
  brandKit: BrandKit
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}

function BrandKitCard({
  brandKit,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}: BrandKitCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {brandKit.name}
              {brandKit.isDefault && (
                <Badge variant="secondary" className="ml-auto">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Default
                </Badge>
              )}
            </CardTitle>
            {brandKit.description && (
              <CardDescription className="mt-1">{brandKit.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Color Palette Preview */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Colors</Label>
            <div className="flex gap-1 mt-1">
              {brandKit.colors.slice(0, 5).map(color => (
                <div
                  key={color.hex}
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
              {brandKit.colors.length > 5 && (
                <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center text-xs">
                  +{brandKit.colors.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Font Preview */}
          {brandKit.fonts.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Fonts</Label>
              <div className="text-sm mt-1">
                {brandKit.fonts.slice(0, 2).map(font => (
                  <div key={font.name} className="truncate">
                    {font.name}
                  </div>
                ))}
                {brandKit.fonts.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{brandKit.fonts.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logo Count */}
          {brandKit.logos.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">
                {brandKit.logos.length} {brandKit.logos.length === 1 ? 'Logo' : 'Logos'}
              </Label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>

          {!brandKit.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onSetDefault()
              }}
            >
              <Star className="h-4 w-4 mr-1" />
              Set Default
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={e => {
              e.stopPropagation()
              if (confirm('Delete this brand kit?')) {
                onDelete()
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Brand Kit Editor Dialog
 */
interface BrandKitEditorDialogProps {
  brandKit: BrandKit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (brandKit: BrandKit) => Promise<void>
}

function BrandKitEditorDialog({
  brandKit,
  open,
  onOpenChange,
  onSave,
}: BrandKitEditorDialogProps) {
  const [name, setName] = useState(brandKit?.name || '')
  const [description, setDescription] = useState(brandKit?.description || '')
  const [colors, setColors] = useState<BrandColor[]>(brandKit?.colors || [])
  const [fonts, setFonts] = useState<BrandFont[]>(brandKit?.fonts || [])
  const [logos, setLogos] = useState<BrandLogo[]>(brandKit?.logos || [])

  /**
   * Add a new color
   */
  const addColor = () => {
    setColors([
      ...colors,
      {
        name: `Color ${colors.length + 1}`,
        hex: '#000000',
        role: 'custom',
      },
    ])
  }

  /**
   * Remove a color
   */
  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index))
  }

  /**
   * Update a color
   */
  const updateColor = (index: number, updates: Partial<BrandColor>) => {
    setColors(colors.map((c, i) => (i === index ? { ...c, ...updates } : c)))
  }

  /**
   * Save brand kit
   */
  const handleSave = async () => {
    const updatedKit: BrandKit = {
      id: brandKit?.id || `brand-kit-${Date.now()}`,
      userId: brandKit?.userId || '',
      workspaceId: brandKit?.workspaceId,
      name,
      description,
      colors,
      fonts,
      logos,
      isDefault: brandKit?.isDefault || false,
      isPublic: brandKit?.isPublic || false,
      createdAt: brandKit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await onSave(updatedKit)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{brandKit ? 'Edit' : 'Create'} Brand Kit</DialogTitle>
          <DialogDescription>
            Define your brand colors, fonts, and logos for consistent styling
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="fonts">Fonts</TabsTrigger>
          </TabsList>

          {/* Basics Tab */}
          <TabsContent value="basics" className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Brand Kit"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-4">
            {colors.map((color, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor={`color-name-${index}`}>Color Name</Label>
                  <Input
                    id={`color-name-${index}`}
                    value={color.name}
                    onChange={e => updateColor(index, { name: e.target.value })}
                  />
                </div>

                <div className="w-24">
                  <Label htmlFor={`color-hex-${index}`}>Hex</Label>
                  <Input
                    id={`color-hex-${index}`}
                    type="color"
                    value={color.hex}
                    onChange={e => updateColor(index, { hex: e.target.value })}
                  />
                </div>

                <div className="w-32">
                  <Label htmlFor={`color-role-${index}`}>Role</Label>
                  <Select
                    value={color.role}
                    onValueChange={value =>
                      updateColor(index, { role: value as BrandColor['role'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="accent">Accent</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="background">Background</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeColor(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button onClick={addColor} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Color
            </Button>
          </TabsContent>

          {/* Fonts Tab */}
          <TabsContent value="fonts" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Font management coming soon
            </p>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || colors.length === 0}>
            <Check className="h-4 w-4 mr-2" />
            Save Brand Kit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
