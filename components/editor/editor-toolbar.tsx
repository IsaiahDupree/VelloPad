'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Save,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
  isSaving: boolean;
  lastSaved: Date | null;
}

export function EditorToolbar({ editor, isSaving, lastSaved }: EditorToolbarProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex items-center gap-1 border-b bg-background px-4 py-2">
      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('code') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Headings */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save Status */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isSaving ? (
          <>
            <Save className="h-4 w-4 animate-pulse" />
            <span>Saving...</span>
          </>
        ) : lastSaved ? (
          <>
            <Save className="h-4 w-4" />
            <span>Saved at {formatTime(lastSaved)}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
