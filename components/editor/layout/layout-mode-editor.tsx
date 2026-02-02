'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageCanvas } from './page-canvas';
import { LayoutSettingsPanel } from './layout-settings-panel';
import { LayoutConfig, DEFAULT_LAYOUT_CONFIG, TrimSize } from './types';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Settings, Maximize2, Minimize2 } from 'lucide-react';
import { debounce } from '@/lib/utils';
import { EditorToolbar } from '../editor-toolbar';

interface Chapter {
  id: string;
  title: string;
  content: any;
  word_count: number;
  position: number;
  layout_config?: LayoutConfig;
}

interface Book {
  id: string;
  trim_size: TrimSize;
}

interface LayoutModeEditorProps {
  bookId: string;
  book: Book;
  chapter: Chapter;
}

export function LayoutModeEditor({ bookId, book, chapter }: LayoutModeEditorProps) {
  const router = useRouter();
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    chapter.layout_config || DEFAULT_LAYOUT_CONFIG
  );
  const [showGuides, setShowGuides] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [scale, setScale] = useState(0.7);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
        class: 'prose max-w-none focus:outline-none p-4',
      },
    },
  });

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (content: any, layoutConfig: LayoutConfig) => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/books/${bookId}/chapters/${chapter.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            layout_config: layoutConfig,
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
      debouncedSave(content, layoutConfig);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, debouncedSave, layoutConfig]);

  // Save layout config changes
  const handleLayoutChange = (newConfig: LayoutConfig) => {
    setLayoutConfig(newConfig);
    if (editor) {
      debouncedSave(editor.getJSON(), newConfig);
    }
  };

  if (!editor) {
    return <div className="flex h-full items-center justify-center">Loading editor...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="border-b bg-background">
        <EditorToolbar editor={editor} isSaving={isSaving} lastSaved={lastSaved} />

        {/* Layout Controls */}
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuides(!showGuides)}
            >
              {showGuides ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Hide Guides
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Show Guides
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              {showSettings ? 'Hide Settings' : 'Show Settings'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Zoom:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(Math.max(0.3, scale - 0.1))}
              disabled={scale <= 0.3}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(Math.min(1.5, scale + 0.1))}
              disabled={scale >= 1.5}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto">
          <PageCanvas
            editor={editor}
            trimSize={book.trim_size}
            layoutConfig={layoutConfig}
            showGuides={showGuides}
            scale={scale}
          />
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 border-l bg-background overflow-hidden">
            <LayoutSettingsPanel
              layoutConfig={layoutConfig}
              onLayoutChange={handleLayoutChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
