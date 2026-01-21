/**
 * Template Selector Component
 * Allows users to choose a photo book template style
 *
 * @see PB-007: Photo Book Templates
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Info } from 'lucide-react'
import { PHOTO_BOOK_TEMPLATES, type PhotoBookTemplate } from '@/src/templates/photo-book'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

interface TemplateSelectorProps {
  photoCount?: number
  selectedTemplateId?: string
  onSelect: (template: PhotoBookTemplate) => void
  showRecommendation?: boolean
}

export function TemplateSelector({
  photoCount,
  selectedTemplateId,
  onSelect,
  showRecommendation = true
}: TemplateSelectorProps) {
  const [selected, setSelected] = useState<string>(selectedTemplateId || 'classic')
  const templates = Object.values(PHOTO_BOOK_TEMPLATES)

  // Determine recommended template
  const recommendedId = photoCount ? getRecommendedId(photoCount) : 'classic'

  const handleSelect = (template: PhotoBookTemplate) => {
    setSelected(template.id)
    onSelect(template)
  }

  return (
    <div className="space-y-6">
      {showRecommendation && photoCount && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <Info className="inline-block w-4 h-4 mr-2" />
            Based on your {photoCount} photos, we recommend the{' '}
            <strong>{PHOTO_BOOK_TEMPLATES[recommendedId].name}</strong> template.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => {
          const isSelected = selected === template.id
          const isRecommended = recommendedId === template.id
          const isCompatible = !photoCount || (
            photoCount >= template.photoRange.min &&
            photoCount <= template.photoRange.max
          )

          return (
            <Card
              key={template.id}
              className={`relative cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'hover:shadow-md'
              } ${!isCompatible ? 'opacity-50' : ''}`}
              onClick={() => isCompatible && handleSelect(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      {isRecommended && (
                        <Badge variant="secondary" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {/* Photo Range */}
                  <div className="text-sm">
                    <span className="font-medium">Photo capacity:</span>{' '}
                    {template.photoRange.min}-{template.photoRange.max} photos
                  </div>

                  {/* Features */}
                  <div>
                    <div className="text-sm font-medium mb-1">Features:</div>
                    <ul className="text-sm text-muted-foreground space-y-0.5">
                      {template.features.slice(0, 3).map((feature, i) => (
                        <li key={i}>• {feature}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Best For */}
                  <div>
                    <div className="text-sm font-medium mb-1">Best for:</div>
                    <div className="flex flex-wrap gap-1">
                      {template.bestFor.slice(0, 3).map((use, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {use}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* More Info Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{template.name}</DialogTitle>
                        <DialogDescription>{template.description}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <h4 className="font-medium mb-2">All Features:</h4>
                          <ul className="text-sm space-y-1">
                            {template.features.map((feature, i) => (
                              <li key={i}>• {feature}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Perfect For:</h4>
                          <div className="flex flex-wrap gap-1">
                            {template.bestFor.map((use, i) => (
                              <Badge key={i} variant="outline">
                                {use}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Layout Options:</h4>
                          <p className="text-sm text-muted-foreground">
                            This template includes {template.layouts.length} different layout
                            patterns that will be automatically applied to your photos.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Get recommended template ID based on photo count
 */
function getRecommendedId(photoCount: number): string {
  if (photoCount <= 30) return 'minimalist'
  if (photoCount <= 60) return 'magazine'
  if (photoCount <= 100) return 'classic'
  return 'collage'
}
