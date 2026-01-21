import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OutlineBuilder } from '@/components/books/outline-builder';
import Link from 'next/link';

interface OutlinePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OutlinePage({ params }: OutlinePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch book details
  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !book) {
    notFound();
  }

  // Fetch chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', id)
    .order('position', { ascending: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <Link href={`/books/${id}`} className="hover:text-foreground">
            {book.title}
          </Link>
          <span>/</span>
          <span>Outline</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Book Outline</h1>
        <p className="text-muted-foreground">
          Organize your chapters and sections. Drag to reorder.
        </p>
      </div>

      {/* Outline Builder */}
      <OutlineBuilder bookId={id} initialChapters={chapters || []} />
    </div>
  );
}
