/**
 * Photo Book Approval Workflow Service
 * Feature: PB-030
 *
 * Client approval workflow for photographers delivering albums
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected';

export type ApprovalDecision = 'approve' | 'request_changes' | 'reject';

export interface ApprovalRequest {
  id: string;
  projectId: string;
  requestedBy: string;
  reviewerEmail: string;
  reviewerUserId: string | null;
  status: ApprovalStatus;
  title: string;
  message: string | null;
  deadline: string | null;
  reviewedAt: string | null;
  decision: ApprovalDecision | null;
  reviewerNotes: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalFeedback {
  id: string;
  approvalRequestId: string;
  pageId: string | null;
  comment: string;
  position: { x: number; y: number; pageNumber?: number } | null;
  isResolved: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creatorEmail?: string;
}

export interface ApprovalHistory {
  id: string;
  approvalRequestId: string;
  fromStatus: ApprovalStatus | null;
  toStatus: ApprovalStatus;
  changedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateApprovalRequestData {
  projectId: string;
  reviewerEmail: string;
  title: string;
  message?: string;
  deadline?: Date;
}

export interface UpdateApprovalRequestData {
  decision: ApprovalDecision;
  reviewerNotes?: string;
}

/**
 * Approval Workflow Service
 */
export class ApprovalWorkflowService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  // ========================================
  // Approval Requests
  // ========================================

  /**
   * Create a new approval request
   */
  async createApprovalRequest(
    data: CreateApprovalRequestData
  ): Promise<ApprovalRequest> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: approval, error } = await this.supabase
      .from('photo_book_approval_requests')
      .insert({
        project_id: data.projectId,
        requested_by: user.id,
        reviewer_email: data.reviewerEmail,
        title: data.title,
        message: data.message || null,
        deadline: data.deadline?.toISOString() || null,
        status: 'submitted',
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapApprovalRequest(approval);
  }

  /**
   * Get approval request by ID
   */
  async getApprovalRequest(id: string): Promise<ApprovalRequest | null> {
    const { data, error } = await this.supabase
      .from('photo_book_approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return this.mapApprovalRequest(data);
  }

  /**
   * Get approval requests for a project
   */
  async getProjectApprovalRequests(projectId: string): Promise<ApprovalRequest[]> {
    const { data, error } = await this.supabase
      .from('photo_book_approval_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapApprovalRequest);
  }

  /**
   * Get active approval request for a project
   */
  async getActiveApprovalRequest(
    projectId: string
  ): Promise<ApprovalRequest | null> {
    const { data, error } = await this.supabase
      .from('photo_book_approval_requests')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['submitted', 'in_review', 'changes_requested'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return this.mapApprovalRequest(data);
  }

  /**
   * Update approval request status
   */
  async updateApprovalStatus(
    id: string,
    status: ApprovalStatus
  ): Promise<void> {
    const { error } = await this.supabase
      .from('photo_book_approval_requests')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Submit review decision
   */
  async submitReview(
    id: string,
    data: UpdateApprovalRequestData
  ): Promise<void> {
    const statusMap: Record<ApprovalDecision, ApprovalStatus> = {
      approve: 'approved',
      request_changes: 'changes_requested',
      reject: 'rejected',
    };

    const { error } = await this.supabase
      .from('photo_book_approval_requests')
      .update({
        status: statusMap[data.decision],
        decision: data.decision,
        reviewer_notes: data.reviewerNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Cancel an approval request
   */
  async cancelApprovalRequest(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('photo_book_approval_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ========================================
  // Feedback
  // ========================================

  /**
   * Add feedback to an approval request
   */
  async addFeedback(
    approvalRequestId: string,
    comment: string,
    pageId?: string,
    position?: { x: number; y: number; pageNumber?: number }
  ): Promise<ApprovalFeedback> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('photo_book_approval_feedback')
      .insert({
        approval_request_id: approvalRequestId,
        page_id: pageId || null,
        comment,
        position: position || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapFeedback(data);
  }

  /**
   * Get feedback for an approval request
   */
  async getFeedback(approvalRequestId: string): Promise<ApprovalFeedback[]> {
    const { data, error } = await this.supabase
      .from('photo_book_approval_feedback')
      .select(`
        *,
        creator:created_by(email)
      `)
      .eq('approval_request_id', approvalRequestId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((d) => ({
      ...this.mapFeedback(d),
      creatorEmail: d.creator?.email,
    }));
  }

  /**
   * Get feedback for a specific page
   */
  async getPageFeedback(
    approvalRequestId: string,
    pageId: string
  ): Promise<ApprovalFeedback[]> {
    const { data, error } = await this.supabase
      .from('photo_book_approval_feedback')
      .select(`
        *,
        creator:created_by(email)
      `)
      .eq('approval_request_id', approvalRequestId)
      .eq('page_id', pageId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((d) => ({
      ...this.mapFeedback(d),
      creatorEmail: d.creator?.email,
    }));
  }

  /**
   * Mark feedback as resolved
   */
  async resolveFeedback(feedbackId: string): Promise<void> {
    const { error } = await this.supabase
      .from('photo_book_approval_feedback')
      .update({ is_resolved: true })
      .eq('id', feedbackId);

    if (error) throw error;
  }

  /**
   * Unmark feedback as resolved
   */
  async unresolve Feedback(feedbackId: string): Promise<void> {
    const { error } = await this.supabase
      .from('photo_book_approval_feedback')
      .update({ is_resolved: false })
      .eq('id', feedbackId);

    if (error) throw error;
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(feedbackId: string): Promise<void> {
    const { error } = await this.supabase
      .from('photo_book_approval_feedback')
      .delete()
      .eq('id', feedbackId);

    if (error) throw error;
  }

  // ========================================
  // History
  // ========================================

  /**
   * Get approval history
   */
  async getApprovalHistory(approvalRequestId: string): Promise<ApprovalHistory[]> {
    const { data, error } = await this.supabase
      .from('photo_book_approval_history')
      .select('*')
      .eq('approval_request_id', approvalRequestId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapHistory);
  }

  // ========================================
  // Utilities
  // ========================================

  /**
   * Get approval request summary
   */
  async getApprovalSummary(approvalRequestId: string) {
    const { data, error } = await this.supabase.rpc('get_approval_request_summary', {
      approval_request_id_param: approvalRequestId,
    });

    if (error) throw error;
    return data?.[0] || null;
  }

  // ========================================
  // Private Mapping Functions
  // ========================================

  private mapApprovalRequest(data: any): ApprovalRequest {
    return {
      id: data.id,
      projectId: data.project_id,
      requestedBy: data.requested_by,
      reviewerEmail: data.reviewer_email,
      reviewerUserId: data.reviewer_user_id,
      status: data.status,
      title: data.title,
      message: data.message,
      deadline: data.deadline,
      reviewedAt: data.reviewed_at,
      decision: data.decision,
      reviewerNotes: data.reviewer_notes,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapFeedback(data: any): ApprovalFeedback {
    return {
      id: data.id,
      approvalRequestId: data.approval_request_id,
      pageId: data.page_id,
      comment: data.comment,
      position: data.position,
      isResolved: data.is_resolved,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapHistory(data: any): ApprovalHistory {
    return {
      id: data.id,
      approvalRequestId: data.approval_request_id,
      fromStatus: data.from_status,
      toStatus: data.to_status,
      changedBy: data.changed_by,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }
}

/**
 * Create a new approval workflow service instance
 */
export function createApprovalWorkflowService(
  supabase?: SupabaseClient
): ApprovalWorkflowService {
  return new ApprovalWorkflowService(supabase);
}
