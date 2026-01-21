'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Target, TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Chapter {
  id: string;
  title: string;
  position: number;
}

interface EditorSidebarProps {
  bookId: string;
  chapter: any;
  allChapters: Chapter[];
  wordCount: number;
}

export function EditorSidebar({ bookId, chapter, allChapters, wordCount }: EditorSidebarProps) {
  const currentIndex = allChapters.findIndex(c => c.id === chapter.id);
  const previousChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;

  // Calculate goals
  const wordGoal = 2000;
  const wordProgress = Math.min((wordCount / wordGoal) * 100, 100);

  return (
    <div className="w-80 flex-shrink-0 border-l bg-muted/30 p-4 overflow-y-auto">
      <div className="space-y-4">
        {/* Word Count */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Word Count
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold">{wordCount.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">
                {wordCount < wordGoal ? `${wordGoal - wordCount} to goal` : 'Goal reached! 🎉'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(wordProgress)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${wordProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chapter Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Chapter Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position</span>
              <Badge variant="secondary">Chapter {chapter.position + 1}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Chapters</span>
              <span className="font-medium">{allChapters.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">
                {new Date(chapter.updated_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Navigation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              asChild
            >
              <Link href={`/books/${bookId}/outline`}>
                <FileText className="mr-2 h-4 w-4" />
                Back to Outline
              </Link>
            </Button>

            {previousChapter && (
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href={`/books/${bookId}/chapters/${previousChapter.id}`}>
                  Previous: {previousChapter.title}
                </Link>
              </Button>
            )}

            {nextChapter && (
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href={`/books/${bookId}/chapters/${nextChapter.id}`}>
                  Next: {nextChapter.title}
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Writing Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Write freely, edit later</p>
            <p>• Aim for 250-500 words per session</p>
            <p>• Use headings to organize sections</p>
            <p>• Save happens automatically</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
