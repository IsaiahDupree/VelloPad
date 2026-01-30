/**
 * PB-018: PDF Download Button
 * Component for users to download print-ready PDFs
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface PDFDownloadButtonProps {
  projectId: string
  projectTitle: string
  disabled?: boolean
}

export function PDFDownloadButton({
  projectId,
  projectTitle,
  disabled = false,
}: PDFDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/photo-book/projects/${projectId}/download-pdf`,
        {
          method: 'POST',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to download PDF')
      }

      // Trigger download
      const link = document.createElement('a')
      link.href = data.data.download_url
      link.download = data.data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to download PDF'
      setError(errorMessage)
      console.error('[PB-018] Download error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleDownload}
        disabled={disabled || isLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Download Link...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
