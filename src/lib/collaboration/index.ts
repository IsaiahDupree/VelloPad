/**
 * Photo Book Collaboration Service
 * Feature: PB-029
 *
 * Enables multiple users to collaborate on photo book projects with:
 * - Role-based permissions (owner, editor, viewer)
 * - Real-time presence tracking
 * - Activity logging
 * - Invitation system
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export type ActivityType =
  | 'created'
  | 'photo_added'
  | 'photo_removed'
  | 'photo_edited'
  | 'page_created'
  | 'page_edited'
  | 'page_deleted'
  | 'page_reordered'
  | 'cover_edited'
  | 'layout_regenerated'
  | 'text_added'
  | 'text_edited'
  | 'text_removed'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'project_published';

export interface Collaborator {
  id: string;
  projectId: string;
  userId: string;
  role: CollaboratorRole;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  lastSeenAt: string | null;
  email?: string;
  isOnline?: boolean;
}

export interface Activity {
  id: string;
  projectId: string;
  userId: string;
  activityType: ActivityType;
  targetId: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  userEmail?: string;
}

export interface Session {
  id: string;
  projectId: string;
  userId: string;
  pageId: string | null;
  cursorPosition: { x: number; y: number; pageNumber?: number } | null;
  lastHeartbeat: string;
  email?: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  pageNumber?: number;
}

/**
 * Photo Book Collaboration Service
 */
export class CollaborationService {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private projectId: string | null = null;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  // ========================================
  // Collaborator Management
  // ========================================

  /**
   * Get all collaborators for a project
   */
  async getCollaborators(projectId: string): Promise<Collaborator[]> {
    const { data, error } = await this.supabase
      .from('photo_book_collaborators')
      .select(`
        *,
        user:user_id(email)
      `)
      .eq('project_id', projectId)
      .order('role', { ascending: false })
      .order('invited_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((d) => ({
      id: d.id,
      projectId: d.project_id,
      userId: d.user_id,
      role: d.role,
      invitedBy: d.invited_by,
      invitedAt: d.invited_at,
      acceptedAt: d.accepted_at,
      lastSeenAt: d.last_seen_at,
      email: d.user?.email,
    }));
  }

  /**
   * Get active collaborators with online status
   */
  async getActiveCollaborators(projectId: string): Promise<Collaborator[]> {
    const { data, error } = await this.supabase.rpc('get_active_collaborators', {
      project_id_param: projectId,
    });

    if (error) throw error;

    return (data || []).map((d) => ({
      id: d.user_id,
      projectId,
      userId: d.user_id,
      role: d.role,
      invitedBy: null,
      invitedAt: '',
      acceptedAt: '',
      lastSeenAt: d.last_seen_at,
      email: d.email,
      isOnline: d.is_online,
    }));
  }

  /**
   * Invite a user to collaborate on a project
   */
  async inviteCollaborator(
    projectId: string,
    email: string,
    role: CollaboratorRole = 'viewer'
  ): Promise<Collaborator> {
    // First, get the user ID from email
    const { data: userData, error: userError } = await this.supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      throw new Error(`User with email ${email} not found`);
    }

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('photo_book_collaborators')
      .insert({
        project_id: projectId,
        user_id: userData.id,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await this.logActivity(projectId, 'collaborator_added', null, {
      email,
      role,
    });

    return {
      id: data.id,
      projectId: data.project_id,
      userId: data.user_id,
      role: data.role,
      invitedBy: data.invited_by,
      invitedAt: data.invited_at,
      acceptedAt: data.accepted_at,
      lastSeenAt: data.last_seen_at,
      email,
    };
  }

  /**
   * Accept a collaboration invitation
   */
  async acceptInvitation(collaboratorId: string): Promise<void> {
    const { error } = await this.supabase
      .from('photo_book_collaborators')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', collaboratorId);

    if (error) throw error;
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(
    collaboratorId: string,
    role: CollaboratorRole
  ): Promise<void> {
    const { error } = await this.supabase
      .from('photo_book_collaborators')
      .update({ role })
      .eq('id', collaboratorId);

    if (error) throw error;
  }

  /**
   * Remove a collaborator from a project
   */
  async removeCollaborator(collaboratorId: string): Promise<void> {
    const { data: collaborator, error: fetchError } = await this.supabase
      .from('photo_book_collaborators')
      .select('project_id, user_id')
      .eq('id', collaboratorId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await this.supabase
      .from('photo_book_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) throw error;

    // Log activity
    if (collaborator) {
      await this.logActivity(
        collaborator.project_id,
        'collaborator_removed',
        collaborator.user_id,
        {}
      );
    }
  }

  /**
   * Check if user can edit project
   */
  async canEdit(projectId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('can_edit_photo_book_project', {
      project_id_param: projectId,
    });

    if (error) throw error;
    return data || false;
  }

  /**
   * Check if user can view project
   */
  async canView(projectId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('can_view_photo_book_project', {
      project_id_param: projectId,
    });

    if (error) throw error;
    return data || false;
  }

  // ========================================
  // Activity Logging
  // ========================================

  /**
   * Log an activity for a project
   */
  async logActivity(
    projectId: string,
    activityType: ActivityType,
    targetId: string | null = null,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    await this.supabase.from('photo_book_activity').insert({
      project_id: projectId,
      user_id: user.id,
      activity_type: activityType,
      target_id: targetId,
      metadata,
    });
  }

  /**
   * Get activity log for a project
   */
  async getActivityLog(
    projectId: string,
    limit: number = 50
  ): Promise<Activity[]> {
    const { data, error } = await this.supabase
      .from('photo_book_activity')
      .select(`
        *,
        user:user_id(email)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((d) => ({
      id: d.id,
      projectId: d.project_id,
      userId: d.user_id,
      activityType: d.activity_type,
      targetId: d.target_id,
      metadata: d.metadata || {},
      createdAt: d.created_at,
      userEmail: d.user?.email,
    }));
  }

  // ========================================
  // Presence & Real-time
  // ========================================

  /**
   * Start presence tracking for a project
   */
  async startPresence(projectId: string, pageId?: string): Promise<void> {
    this.projectId = projectId;

    // Create or update session
    await this.updateSession(projectId, pageId);

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updateSession(projectId, pageId);
    }, 30000);
  }

  /**
   * Stop presence tracking
   */
  async stopPresence(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.projectId) {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (user) {
        await this.supabase
          .from('photo_book_sessions')
          .delete()
          .eq('project_id', this.projectId)
          .eq('user_id', user.id);
      }
    }

    this.projectId = null;
  }

  /**
   * Update cursor position
   */
  async updateCursorPosition(
    projectId: string,
    position: CursorPosition
  ): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    await this.supabase
      .from('photo_book_sessions')
      .upsert({
        project_id: projectId,
        user_id: user.id,
        cursor_position: position,
        last_heartbeat: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('user_id', user.id);
  }

  /**
   * Get active sessions for a project
   */
  async getActiveSessions(projectId: string): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from('photo_book_sessions')
      .select(`
        *,
        user:user_id(email)
      `)
      .eq('project_id', projectId)
      .gte('last_heartbeat', new Date(Date.now() - 2 * 60 * 1000).toISOString());

    if (error) throw error;

    return (data || []).map((d) => ({
      id: d.id,
      projectId: d.project_id,
      userId: d.user_id,
      pageId: d.page_id,
      cursorPosition: d.cursor_position,
      lastHeartbeat: d.last_heartbeat,
      email: d.user?.email,
    }));
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToProject(
    projectId: string,
    callbacks: {
      onCollaboratorJoined?: (collaborator: Collaborator) => void;
      onCollaboratorLeft?: (userId: string) => void;
      onActivity?: (activity: Activity) => void;
      onCursorMove?: (session: Session) => void;
    }
  ): () => void {
    this.channel = this.supabase.channel(`photo-book:${projectId}`);

    // Subscribe to collaborator changes
    this.channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'photo_book_collaborators',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        if (callbacks.onCollaboratorJoined) {
          callbacks.onCollaboratorJoined(payload.new as any);
        }
      }
    );

    this.channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'photo_book_collaborators',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        if (callbacks.onCollaboratorLeft) {
          callbacks.onCollaboratorLeft((payload.old as any).user_id);
        }
      }
    );

    // Subscribe to activity log
    this.channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'photo_book_activity',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        if (callbacks.onActivity) {
          callbacks.onActivity(payload.new as any);
        }
      }
    );

    // Subscribe to cursor movements
    this.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'photo_book_sessions',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        if (callbacks.onCursorMove && payload.new) {
          callbacks.onCursorMove(payload.new as any);
        }
      }
    );

    this.channel.subscribe();

    // Return unsubscribe function
    return () => {
      if (this.channel) {
        this.supabase.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }

  // ========================================
  // Private Methods
  // ========================================

  private async updateSession(projectId: string, pageId?: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    await this.supabase
      .from('photo_book_sessions')
      .upsert({
        project_id: projectId,
        user_id: user.id,
        page_id: pageId || null,
        last_heartbeat: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    // Update last_seen_at in collaborators table
    await this.supabase
      .from('photo_book_collaborators')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('user_id', user.id);
  }
}

/**
 * Create a new collaboration service instance
 */
export function createCollaborationService(
  supabase?: SupabaseClient
): CollaborationService {
  return new CollaborationService(supabase);
}
