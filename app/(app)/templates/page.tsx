import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDefaultWorkspace } from '@/lib/workspace/utils'
import { TemplateGallery } from '@/components/templates/TemplateGallery'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const workspace = await getDefaultWorkspace(user.id)
  if (!workspace) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Template Gallery</h1>
        <p className="text-muted-foreground">
          Choose from professional templates for your book's interior and cover design.
        </p>
      </div>

      <TemplateGallery workspaceId={workspace.id} />
    </div>
  )
}
