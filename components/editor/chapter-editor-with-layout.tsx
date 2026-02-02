'use client';

import { useState } from 'react';
import { ChapterEditor } from './chapter-editor';
import { LayoutModeEditor } from './layout/layout-mode-editor';
import { Button } from '@/components/ui/button';
import { FileText, Layout } from 'lucide-react';
import { TrimSize } from './layout/types';

interface Chapter {
  id: string;
  title: string;
  content: any;
  word_count: number;
  position: number;
  layout_config?: any;
}

interface Book {
  id: string;
  trim_size: TrimSize;
}

interface ChapterEditorWithLayoutProps {
  bookId: string;
  book: Book;
  chapter: Chapter;
  allChapters: Array<{ id: string; title: string; position: number }>;
}

type EditorMode = 'write' | 'layout';

export function ChapterEditorWithLayout({
  bookId,
  book,
  chapter,
  allChapters,
}: ChapterEditorWithLayoutProps) {
  const [mode, setMode] = useState<EditorMode>('write');

  return (
    <div className="flex flex-col h-full">
      {/* Mode Switcher */}
      <div className="border-b bg-background p-2 flex items-center gap-2">
        <Button
          variant={mode === 'write' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('write')}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Write Mode
        </Button>
        <Button
          variant={mode === 'layout' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('layout')}
          className="gap-2"
        >
          <Layout className="h-4 w-4" />
          Layout Mode
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {mode === 'write'
            ? 'Focus on writing your content'
            : 'Preview and adjust page layout'}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'write' ? (
          <ChapterEditor bookId={bookId} chapter={chapter} allChapters={allChapters} />
        ) : (
          <LayoutModeEditor bookId={bookId} book={book} chapter={chapter} />
        )}
      </div>
    </div>
  );
}
