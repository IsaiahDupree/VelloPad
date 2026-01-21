/**
 * Assets Page
 * View and manage workspace assets
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDefaultWorkspace } from '@/lib/workspace/utils'
import { AssetLibrary } from '@/components/assets/AssetLibrary'

export default async function AssetsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  const workspace = await getDefaultWorkspace(user.id)
  if (!workspace) {
    redirect('/auth/login')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Asset Library</h1>
        <p className="text-gray-600">
          Upload and manage images, fonts, and other assets for your books
        </p>
      </div>

      <AssetLibrary workspaceId={workspace.id} />
    </div>
  )
}
