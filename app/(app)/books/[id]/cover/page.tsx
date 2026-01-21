import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCoverDesign } from '@/lib/cover'
import { CoverDesigner } from '@/components/cover/CoverDesigner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function CoverDesignPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*, workspace_id')
    .eq('id', params.id)
    .single()

  if (bookError || !book) {
    redirect('/dashboard')
  }

  // Verify access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', book.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  // Get cover design
  const design = await getCoverDesign(params.id)
  if (!design) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href={`/books/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Book
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cover Design</h1>
        <p className="text-muted-foreground">
          Customize your book's cover with fonts, colors, and layout options.
        </p>
      </div>

      <CoverDesigner bookId={params.id} initialDesign={design} />
    </div>
  )
}
