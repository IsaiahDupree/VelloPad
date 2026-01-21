'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PhotoUploader } from '@/components/photo-book/PhotoUploader'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function PhotoBookUploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams?.get('projectId')

  const [project, setProject] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) {
      // Create new project if no projectId provided
      createNewProject()
    } else {
      loadProject()
    }
  }, [projectId])

  async function createNewProject() {
    try {
      // Get workspace from session or default
      const workspaceId = localStorage.getItem('currentWorkspaceId')
      if (!workspaceId) {
        console.error('No workspace selected')
        setLoading(false)
        return
      }

      const response = await fetch('/api/photo-book/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          title: 'New Photo Book',
          layoutStyle: 'classic'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const newProject = await response.json()
      setProject(newProject)

      // Update URL with new projectId
      router.replace(`/photo-book/upload?projectId=${newProject.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadProject() {
    try {
      // Load project details
      const projectResponse = await fetch(`/api/photo-book/projects/${projectId}`)
      if (projectResponse.ok) {
        const projectData = await projectResponse.json()
        setProject(projectData)
      }

      // Load existing photos
      const photosResponse = await fetch(`/api/photo-book/projects/${projectId}/photos`)
      if (photosResponse.ok) {
        const photosData = await photosResponse.json()
        setPhotos(photosData.photos || [])
      }
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleUploadComplete(newPhotos: any[]) {
    setPhotos(prev => [...prev, ...newPhotos])
  }

  function handleContinue() {
    if (!projectId) return
    router.push(`/photo-book/editor?projectId=${projectId}`)
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <p className="text-red-600">Failed to load project</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold">Upload Photos</h1>
        <p className="text-gray-600 mt-2">
          Add photos to your photo book. You can upload up to 100 photos.
        </p>
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{project.title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {project.page_size} • {project.binding_type} • {project.layout_style}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{photos.length}</p>
            <p className="text-sm text-gray-600">photos</p>
          </div>
        </div>
      </div>

      {/* Uploader */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <PhotoUploader
          projectId={project.id}
          onUploadComplete={handleUploadComplete}
          maxFiles={100 - photos.length}
        />
      </div>

      {/* Uploaded Photos Grid */}
      {photos.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">
            Uploaded Photos ({photos.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
              >
                <img
                  src={photo.storage_url}
                  alt={photo.original_filename}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continue Button */}
      {photos.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleContinue} size="lg">
            Continue to Layout
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
