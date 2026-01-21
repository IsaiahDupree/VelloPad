'use client';

/**
 * Version History Component - BS-205
 * Displays and manages version snapshots
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Clock,
  Save,
  RotateCcw,
  Trash2,
  Milestone,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface VersionSnapshot {
  id: string;
  book_id: string;
  snapshot_type: 'manual' | 'auto_milestone' | 'pre_restore';
  label: string | null;
  description: string | null;
  word_count: number;
  chapter_count: number;
  completion_percent: number;
  milestone_name: string | null;
  created_at: string;
}

interface VersionHistoryProps {
  bookId: string;
}

export function VersionHistory({ bookId }: VersionHistoryProps) {
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch snapshots
  const fetchSnapshots = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}/snapshots`);
      if (response.ok) {
        const data = await response.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [bookId]);

  // Create manual snapshot
  const createSnapshot = async () => {
    setCreating(true);
    try {
      const response = await fetch(`/api/books/${bookId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, description }),
      });

      if (response.ok) {
        setLabel('');
        setDescription('');
        setShowCreateDialog(false);
        await fetchSnapshots();
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
    } finally {
      setCreating(false);
    }
  };

  // Restore from snapshot
  const restoreSnapshot = async (snapshotId: string) => {
    try {
      const response = await fetch(`/api/books/${bookId}/snapshots/${snapshotId}/restore`, {
        method: 'POST',
      });

      if (response.ok) {
        window.location.reload(); // Reload to show restored content
      }
    } catch (error) {
      console.error('Error restoring snapshot:', error);
    }
  };

  // Delete snapshot
  const deleteSnapshot = async (snapshotId: string) => {
    try {
      const response = await fetch(`/api/books/${bookId}/snapshots/${snapshotId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSnapshots();
      }
    } catch (error) {
      console.error('Error deleting snapshot:', error);
    }
  };

  const getSnapshotIcon = (type: string) => {
    switch (type) {
      case 'manual':
        return <Save className="h-4 w-4" />;
      case 'auto_milestone':
        return <Milestone className="h-4 w-4" />;
      case 'pre_restore':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSnapshotTypeLabel = (type: string) => {
    switch (type) {
      case 'manual':
        return 'Manual';
      case 'auto_milestone':
        return 'Milestone';
      case 'pre_restore':
        return 'Pre-Restore';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Version History</CardTitle>
            <CardDescription>
              {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Save Snapshot
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Create Snapshot</AlertDialogTitle>
                <AlertDialogDescription>
                  Save the current state of your book. You can restore to this version later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g., First draft complete"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="Add notes about this version"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={createSnapshot} disabled={creating || !label}>
                  {creating ? 'Creating...' : 'Create Snapshot'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {snapshots.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            No snapshots yet. Create your first snapshot to track versions.
          </div>
        ) : (
          snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">{getSnapshotIcon(snapshot.snapshot_type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {snapshot.label || snapshot.milestone_name || 'Untitled Snapshot'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getSnapshotTypeLabel(snapshot.snapshot_type)}
                    </Badge>
                  </div>
                  {snapshot.description && (
                    <p className="text-xs text-muted-foreground">{snapshot.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(snapshot.created_at).toLocaleString()}
                    </span>
                    <span>{snapshot.word_count.toLocaleString()} words</span>
                    <span>{snapshot.chapter_count} chapters</span>
                    <span>{snapshot.completion_percent}% complete</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restore Snapshot?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                          <div>
                            This will replace your current book content with the selected snapshot.
                            A backup of your current state will be created automatically.
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => restoreSnapshot(snapshot.id)}>
                        Restore
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {snapshot.snapshot_type === 'manual' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Snapshot?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This snapshot will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSnapshot(snapshot.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
