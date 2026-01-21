'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Template, TemplateCategory } from '@/lib/templates'

interface TemplateGalleryProps {
  workspaceId?: string
  category?: TemplateCategory
  onSelect?: (template: Template) => void
}

export function TemplateGallery({ workspaceId, category, onSelect }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TemplateCategory | 'all'>('all')

  useEffect(() => {
    fetchTemplates()
  }, [workspaceId, category])

  async function fetchTemplates() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (workspaceId) params.set('workspaceId', workspaceId)
      if (category) params.set('category', category)

      const response = await fetch(`/api/templates?${params}`)
      if (!response.ok) throw new Error('Failed to fetch templates')

      const data = await response.json()
      setTemplates(data.templates)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = filter === 'all'
    ? templates
    : templates.filter(t => t.category === filter || t.category === 'both')

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="aspect-[3/4] bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      {!category && (
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Templates
          </Button>
          <Button
            variant={filter === 'interior' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('interior')}
          >
            Interior
          </Button>
          <Button
            variant={filter === 'cover' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('cover')}
          >
            Cover
          </Button>
          <Button
            variant={filter === 'both' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('both')}
          >
            Complete Sets
          </Button>
        </div>
      )}

      {/* Template grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No templates found.</p>
            <p className="text-sm mt-2">Create your first template to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {template.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant={template.is_global ? 'default' : 'secondary'} className="text-xs">
                      {template.is_global ? 'Global' : 'Custom'}
                    </Badge>
                    {template.is_featured && (
                      <Badge variant="outline" className="text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                {/* Template preview */}
                <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {template.preview_image_url ? (
                    <img
                      src={template.preview_image_url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <div className="text-4xl mb-2">📄</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {template.category} Template
                      </div>
                    </div>
                  )}
                </div>

                {/* Template metadata */}
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="capitalize font-medium">{template.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span className="font-medium">{template.usage_count} times</span>
                  </div>
                </div>
              </CardContent>

              {onSelect && (
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => onSelect(template)}
                  >
                    Use Template
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
