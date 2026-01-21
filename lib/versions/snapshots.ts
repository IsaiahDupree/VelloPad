/**
 * Version Snapshots - BS-205
 * Manual and automatic milestone snapshots with restore functionality
 */

import { createClient } from '@/lib/supabase/server';

export type SnapshotType = 'manual' | 'auto_milestone' | 'pre_restore';

export interface VersionSnapshot {
  id: string;
  book_id: string;
  created_by: string;
  snapshot_type: SnapshotType;
  label: string | null;
  description: string | null;
  book_data: any;
  chapters_data: any[];
  word_count: number;
  chapter_count: number;
  completion_percent: number;
  milestone_name: string | null;
  created_at: string;
}

export interface CreateSnapshotParams {
  bookId: string;
  userId: string;
  type?: SnapshotType;
  label?: string;
  description?: string;
}

/**
 * Create a manual snapshot of a book
 */
export async function createSnapshot(params: CreateSnapshotParams): Promise<VersionSnapshot | null> {
  const supabase = await createClient();
  const { bookId, userId, type = 'manual', label, description } = params;

  try {
    // Fetch current book state
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      console.error('Error fetching book:', bookError);
      return null;
    }

    // Fetch all chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('book_id', bookId)
      .order('position', { ascending: true });

    if (chaptersError) {
      console.error('Error fetching chapters:', chaptersError);
      return null;
    }

    // Create snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('version_snapshots')
      .insert({
        book_id: bookId,
        created_by: userId,
        snapshot_type: type,
        label,
        description,
        book_data: book,
        chapters_data: chapters || [],
        word_count: book.word_count || 0,
        chapter_count: chapters?.length || 0,
        completion_percent: book.completion_percent || 0,
      })
      .select()
      .single();

    if (snapshotError) {
      console.error('Error creating snapshot:', snapshotError);
      return null;
    }

    return snapshot;
  } catch (error) {
    console.error('Error in createSnapshot:', error);
    return null;
  }
}

/**
 * Get all snapshots for a book
 */
export async function getSnapshots(bookId: string): Promise<VersionSnapshot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('version_snapshots')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching snapshots:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a specific snapshot by ID
 */
export async function getSnapshot(snapshotId: string): Promise<VersionSnapshot | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('version_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();

  if (error) {
    console.error('Error fetching snapshot:', error);
    return null;
  }

  return data;
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(snapshotId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('version_snapshots')
    .delete()
    .eq('id', snapshotId);

  if (error) {
    console.error('Error deleting snapshot:', error);
    return false;
  }

  return true;
}

/**
 * Restore a book from a snapshot
 * Creates a pre-restore snapshot before applying the restore
 */
export async function restoreSnapshot(
  snapshotId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Fetch the snapshot to restore
    const snapshot = await getSnapshot(snapshotId);
    if (!snapshot) {
      return { success: false, error: 'Snapshot not found' };
    }

    const bookId = snapshot.book_id;

    // Create a pre-restore snapshot of current state
    const preRestoreSnapshot = await createSnapshot({
      bookId,
      userId,
      type: 'pre_restore',
      label: 'Before restore',
      description: `Automatic snapshot before restoring to: ${snapshot.label || new Date(snapshot.created_at).toLocaleString()}`,
    });

    if (!preRestoreSnapshot) {
      return { success: false, error: 'Failed to create pre-restore snapshot' };
    }

    // Restore book metadata (excluding id, created_at, created_by)
    const bookData = snapshot.book_data;
    const { error: bookUpdateError } = await supabase
      .from('books')
      .update({
        title: bookData.title,
        subtitle: bookData.subtitle,
        author: bookData.author,
        genre: bookData.genre,
        trim_size: bookData.trim_size,
        binding: bookData.binding,
        isbn: bookData.isbn,
        word_count: bookData.word_count,
        completion_percent: bookData.completion_percent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookId);

    if (bookUpdateError) {
      console.error('Error updating book:', bookUpdateError);
      return { success: false, error: 'Failed to restore book metadata' };
    }

    // Delete existing chapters
    const { error: deleteError } = await supabase
      .from('chapters')
      .delete()
      .eq('book_id', bookId);

    if (deleteError) {
      console.error('Error deleting chapters:', deleteError);
      return { success: false, error: 'Failed to delete existing chapters' };
    }

    // Restore chapters
    const chaptersToRestore = snapshot.chapters_data.map((chapter: any) => ({
      book_id: bookId,
      title: chapter.title,
      content: chapter.content,
      word_count: chapter.word_count,
      position: chapter.position,
      section_id: chapter.section_id,
    }));

    if (chaptersToRestore.length > 0) {
      const { error: chaptersInsertError } = await supabase
        .from('chapters')
        .insert(chaptersToRestore);

      if (chaptersInsertError) {
        console.error('Error restoring chapters:', chaptersInsertError);
        return { success: false, error: 'Failed to restore chapters' };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in restoreSnapshot:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get milestone snapshots for a book
 */
export async function getMilestoneSnapshots(bookId: string): Promise<VersionSnapshot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('version_snapshots')
    .select('*')
    .eq('book_id', bookId)
    .eq('snapshot_type', 'auto_milestone')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching milestone snapshots:', error);
    return [];
  }

  return data || [];
}

/**
 * Get manual snapshots for a book
 */
export async function getManualSnapshots(bookId: string): Promise<VersionSnapshot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('version_snapshots')
    .select('*')
    .eq('book_id', bookId)
    .eq('snapshot_type', 'manual')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching manual snapshots:', error);
    return [];
  }

  return data || [];
}

/**
 * Get snapshot statistics for a book
 */
export async function getSnapshotStats(bookId: string) {
  const snapshots = await getSnapshots(bookId);

  return {
    total: snapshots.length,
    manual: snapshots.filter((s) => s.snapshot_type === 'manual').length,
    milestones: snapshots.filter((s) => s.snapshot_type === 'auto_milestone').length,
    preRestore: snapshots.filter((s) => s.snapshot_type === 'pre_restore').length,
    latest: snapshots[0] || null,
    oldest: snapshots[snapshots.length - 1] || null,
  };
}
