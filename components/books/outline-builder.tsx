'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Save,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Chapter {
  id: string;
  title: string;
  word_count: number;
  position: number;
  created_at: string;
  updated_at: string;
}

interface OutlineBuilderProps {
  bookId: string;
  initialChapters: Chapter[];
}

export function OutlineBuilder({ bookId, initialChapters }: OutlineBuilderProps) {
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [isAdding, setIsAdding] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newChapterTitle,
          position: chapters.length,
        }),
      });

      if (!response.ok) throw new Error('Failed to create chapter');

      const { chapter } = await response.json();
      setChapters([...chapters, chapter]);
      setNewChapterTitle('');
      setIsAdding(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating chapter:', error);
      alert('Failed to create chapter');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTitle = async (chapterId: string) => {
    if (!editTitle.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/books/${bookId}/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle,
        }),
      });

      if (!response.ok) throw new Error('Failed to update chapter');

      const { chapter } = await response.json();
      setChapters(chapters.map(c => c.id === chapterId ? chapter : c));
      setEditingId(null);
      setEditTitle('');
      router.refresh();
    } catch (error) {
      console.error('Error updating chapter:', error);
      alert('Failed to update chapter');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/books/${bookId}/chapters/${deleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete chapter');

      // Update positions of remaining chapters
      const remaining = chapters
        .filter(c => c.id !== deleteId)
        .map((c, index) => ({ ...c, position: index }));

      setChapters(remaining);
      setDeleteId(null);
      router.refresh();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      alert('Failed to delete chapter');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newChapters = [...chapters];
    const draggedChapter = newChapters[draggedIndex];

    newChapters.splice(draggedIndex, 1);
    newChapters.splice(index, 0, draggedChapter);

    setChapters(newChapters);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    setLoading(true);
    try {
      // Update positions in database
      const updates = chapters.map((chapter, index) => ({
        id: chapter.id,
        position: index,
      }));

      const response = await fetch(`/api/books/${bookId}/chapters/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) throw new Error('Failed to reorder chapters');

      router.refresh();
    } catch (error) {
      console.error('Error reordering chapters:', error);
      alert('Failed to reorder chapters');
      // Revert on error
      router.refresh();
    } finally {
      setDraggedIndex(null);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Chapter List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Chapters ({chapters.length})</CardTitle>
          <Button onClick={() => setIsAdding(true)} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Chapter
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No chapters yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Start building your book by adding your first chapter.
              </p>
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Chapter
              </Button>
            </div>
          ) : (
            chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${
                  draggedIndex === index ? 'opacity-50' : ''
                } hover:bg-muted`}
              >
                <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />

                {editingId === chapter.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Chapter title"
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTitle(chapter.id);
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditTitle('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateTitle(chapter.id)}
                      disabled={loading || !editTitle.trim()}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditTitle('');
                      }}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{chapter.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {chapter.word_count} words
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/books/${bookId}/chapters/${chapter.id}`}>
                          <FileText className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(chapter.id);
                          setEditTitle(chapter.title);
                        }}
                        disabled={loading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(chapter.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}

          {/* Add Chapter Form */}
          {isAdding && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4">
              <Input
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Chapter title"
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddChapter();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewChapterTitle('');
                  }
                }}
              />
              <Button
                onClick={handleAddChapter}
                disabled={loading || !newChapterTitle.trim()}
              >
                Add
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewChapterTitle('');
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the chapter
              and all its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChapter}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
