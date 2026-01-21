import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChapterEditor } from '@/components/editor/chapter-editor';
import Link from 'next/link';

interface ChapterPageProps {
  params: Promise<{
    bookId: string;
    chapterId: string;
  }>;
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { bookId, chapterId } = await params;
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
    .eq('id', bookId)
    .single();

  if (bookError || !book) {
    notFound();
  }

  // Fetch chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .eq('book_id', bookId)
    .single();

  if (chapterError || !chapter) {
    notFound();
  }

  // Fetch all chapters for navigation
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('id, title, position')
    .eq('book_id', bookId)
    .order('position', { ascending: true });

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <span>/</span>
            <Link href={`/books/${bookId}`} className="hover:text-foreground">
              {book.title}
            </Link>
            <span>/</span>
            <Link href={`/books/${bookId}/outline`} className="hover:text-foreground">
              Outline
            </Link>
            <span>/</span>
            <span className="text-foreground">{chapter.title}</span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <ChapterEditor
          bookId={bookId}
          chapter={chapter}
          allChapters={allChapters || []}
        />
      </div>
    </div>
  );
}
