import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Edit, FileText, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { VersionHistory } from '@/components/books/VersionHistory';

interface BookPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BookPage({ params }: BookPageProps) {
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

  const chapterCount = chapters?.length || 0;

  // Calculate next steps
  const nextStep = chapterCount === 0
    ? { title: 'Create your first chapter', action: 'Start Writing', link: `/books/${id}/outline` }
    : book.word_count < 1000
    ? { title: 'Write 1,000 words', action: 'Keep Writing', link: `/books/${id}/outline` }
    : book.completion_percent < 50
    ? { title: 'Complete your outline', action: 'View Outline', link: `/books/${id}/outline` }
    : { title: 'Generate print preview', action: 'Preview', link: `/books/${id}/preview` };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">{book.title}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{book.title}</h1>
          {book.subtitle && (
            <p className="text-lg text-muted-foreground">{book.subtitle}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {book.author && (
              <Badge variant="secondary">by {book.author}</Badge>
            )}
            <Badge variant="outline">{book.genre?.replace('_', ' ')}</Badge>
            <Badge variant="outline">{book.trim_size?.replace('x', ' × ')}"</Badge>
            <Badge variant="outline">{book.binding?.replace('_', ' ')}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/books/${id}/outline`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Book
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{book.completion_percent}%</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${book.completion_percent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Word Count</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{book.word_count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {book.word_count < 10000 ? 'Keep writing!' : 'Great progress'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chapters</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chapterCount}</div>
            <p className="text-xs text-muted-foreground">
              {chapterCount === 0 ? 'Start your outline' : `${chapterCount} chapter${chapterCount !== 1 ? 's' : ''}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(book.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(book.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Step CTA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Next Step</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-medium">{nextStep.title}</div>
            <div className="text-sm text-muted-foreground">
              Keep the momentum going to reach your print-ready goal.
            </div>
          </div>
          <Button asChild>
            <Link href={nextStep.link}>{nextStep.action}</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Chapters and Version History */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chapters */}
        {chapterCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Chapters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chapters?.map((chapter, index) => (
                <Link
                  key={chapter.id}
                  href={`/books/${id}/chapters/${chapter.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{chapter.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {chapter.word_count} words
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(chapter.updated_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Version History */}
        <VersionHistory bookId={id} />
      </div>
    </div>
  );
}
