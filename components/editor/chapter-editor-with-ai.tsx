'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EditorToolbar } from './editor-toolbar';
import { EditorSidebar } from './editor-sidebar';
import { AISidekickPanel } from '../ai/sidekick/ai-sidekick-panel';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { debounce } from '@/lib/utils';

interface Chapter {
  id: string;
  title: string;
  content: any;
  word_count: number;
  position: number;
}

interface ChapterEditorWithAIProps {
  bookId: string;
  chapter: Chapter;
  allChapters: Array<{ id: string; title: string; position: number }>;
}

export function ChapterEditorWithAI({
  bookId,
  chapter,
  allChapters,
}: ChapterEditorWithAIProps) {
  const router = useRouter();
  const [wordCount, setWordCount] = useState(chapter.word_count);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAI, setShowAI] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image,
      Placeholder.configure({
        placeholder: 'Start writing your chapter...',
      }),
    ],
    content: chapter.content,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-12 py-8',
      },
    },
  });

  // Calculate word count
  const calculateWordCount = useCallback(() => {
    if (!editor) return 0;
    const text = editor.getText();
    const words = text.trim().split(/\s+/).filter((word) => word.length > 0);
    return words.length;
  }, [editor]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (content: any, wordCount: number) => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/books/${bookId}/chapters/${chapter.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            word_count: wordCount,
          }),
        });

        if (response.ok) {
          setLastSaved(new Date());
          router.refresh();
        }
      } catch (error) {
        console.error('Error saving chapter:', error);
      } finally {
        setIsSaving(false);
      }
    }, 2000),
    [bookId, chapter.id, router]
  );

  // Auto-save on content change
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const content = editor.getJSON();
      const words = calculateWordCount();
      setWordCount(words);
      debouncedSave(content, words);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, calculateWordCount, debouncedSave]);

  if (!editor) {
    return <div className="flex h-full items-center justify-center">Loading editor...</div>;
  }

  return (
    <div className="flex h-full">
      {/* Main Editor Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b">
          <EditorToolbar editor={editor} isSaving={isSaving} lastSaved={lastSaved} />

          {/* AI Toggle */}
          <div className="px-4 py-2 border-t flex items-center justify-between">
            <Button
              variant={showAI ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAI(!showAI)}
              className="gap-2"
            >
              {showAI ? (
                <>
                  <X className="h-4 w-4" />
                  Hide AI Assistant
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Show AI Assistant
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              Get AI help with writing, rewriting, and ideas
            </span>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-4xl">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* AI Sidekick Panel */}
      {showAI && (
        <div className="w-80">
          <AISidekickPanel editor={editor} chapterTitle={chapter.title} />
        </div>
      )}

      {/* Sidebar */}
      {!showAI && (
        <EditorSidebar
          bookId={bookId}
          chapter={chapter}
          allChapters={allChapters}
          wordCount={wordCount}
        />
      )}
    </div>
  );
}
