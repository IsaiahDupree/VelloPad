import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BookPreview } from '@/components/preview/BookPreview';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PreviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch book details
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (bookError || !book) {
    notFound();
  }

  // Fetch chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', id)
    .order('position', { ascending: true });

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/books/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Book
              </Link>
            </Button>
            <div className="border-l pl-4">
              <h1 className="text-lg font-semibold">{book.title}</h1>
              <p className="text-sm text-muted-foreground">Preview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Component */}
      <div className="flex-1 overflow-hidden">
        <BookPreview book={book} chapters={chapters || []} />
      </div>
    </div>
  );
}
