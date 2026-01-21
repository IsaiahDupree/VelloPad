/**
 * Lifecycle Email Automations
 * Feature: BS-702
 *
 * Automated email campaigns for key user lifecycle events:
 * - Activation: New user welcome (24h after signup)
 * - Stalled: Writer hasn't written in 7 days
 * - Proof Push: Completed book but hasn't ordered (3 days)
 * - Post-Delivery: Order delivered, request feedback (7 days)
 */

import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { getEmailBranding, wrapEmailWithBranding, applyBrandingToEmail } from '@/lib/email/tenant-branding';

// ============================================================================
// TYPES
// ============================================================================

export type LifecycleEmailType =
  | 'activation'
  | 'stalled_writer'
  | 'proof_push'
  | 'post_delivery'
  | 'first_draft_complete'
  | 'order_confirmation'
  | 'order_shipped';

export interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  subject_line: string;
  html_body: string;
  text_body?: string;
  variables: string[];
}

export interface SendEmailParams {
  userId: string;
  workspaceId: string;
  templateKey: string;
  toEmail: string;
  toName?: string;
  variables?: Record<string, any>;
  triggerEvent?: string;
  metadata?: Record<string, any>;
  tenantId?: string | null; // Optional tenant ID for branding
}

export interface EmailSendResult {
  success: boolean;
  emailSendId?: string;
  providerMessageId?: string;
  error?: string;
}

// ============================================================================
// EMAIL SERVICE
// ============================================================================

export class LifecycleEmailService {
  private resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  /**
   * Send a lifecycle email using a template
   */
  async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    try {
      const supabase = await createClient();

      // 1. Get template
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_key', params.templateKey)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        return {
          success: false,
          error: `Template ${params.templateKey} not found or inactive`,
        };
      }

      // 2. Render template with variables
      const renderedSubject = this.renderTemplate(
        template.subject_line,
        params.variables || {}
      );
      const renderedHtml = this.renderTemplate(
        template.html_body,
        params.variables || {}
      );
      const renderedText = template.text_body
        ? this.renderTemplate(template.text_body, params.variables || {})
        : undefined;

      // 3. Get tenant branding and apply to email
      const brandedEmail = await applyBrandingToEmail(
        params.tenantId || null,
        renderedSubject,
        renderedHtml,
        renderedText
      );

      // 4. Create email send record with branding
      const { data: emailSend, error: sendError } = await supabase
        .from('email_sends')
        .insert({
          workspace_id: params.workspaceId,
          user_id: params.userId,
          template_id: template.id,
          to_email: params.toEmail,
          to_name: params.toName,
          from_email: brandedEmail.from_email,
          from_name: brandedEmail.from_name,
          subject: brandedEmail.subject,
          email_type: template.template_category || 'lifecycle',
          trigger_event: params.triggerEvent,
          status: 'pending',
          metadata: {
            ...(params.metadata || {}),
            tenant_id: params.tenantId,
          },
        })
        .select()
        .single();

      if (sendError || !emailSend) {
        return {
          success: false,
          error: 'Failed to create email send record',
        };
      }

      // 5. Send via Resend (if configured)
      if (this.resend) {
        try {
          const result = await this.resend.emails.send({
            from: `${brandedEmail.from_name} <${brandedEmail.from_email}>`,
            to: params.toEmail,
            subject: brandedEmail.subject,
            html: brandedEmail.html,
            text: brandedEmail.text,
            ...(brandedEmail.reply_to && { reply_to: brandedEmail.reply_to }),
          });

          // Update email send with provider message ID
          await supabase
            .from('email_sends')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              provider_message_id: (result as any).id || (result as any).data?.id,
            })
            .eq('id', emailSend.id);

          return {
            success: true,
            emailSendId: emailSend.id,
            providerMessageId: (result as any).id || (result as any).data?.id,
          };
        } catch (resendError: any) {
          // Update email send with error
          await supabase
            .from('email_sends')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: resendError.message,
            })
            .eq('id', emailSend.id);

          return {
            success: false,
            emailSendId: emailSend.id,
            error: resendError.message,
          };
        }
      } else {
        // No email provider configured - mark as sent for testing
        await supabase
          .from('email_sends')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', emailSend.id);

        return {
          success: true,
          emailSendId: emailSend.id,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Render template with variables
   * Supports {{variable}} syntax
   */
  private renderTemplate(
    template: string,
    variables: Record<string, any>
  ): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }

    return rendered;
  }

  /**
   * Get email template by key
   */
  async getTemplate(templateKey: string): Promise<EmailTemplate | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Update email send status (for webhooks)
   */
  async updateEmailStatus(
    emailSendId: string,
    status: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const supabase = await createClient();

      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Set timestamp based on status
      if (status === 'delivered') updates.delivered_at = new Date().toISOString();
      if (status === 'opened') updates.opened_at = new Date().toISOString();
      if (status === 'clicked') updates.clicked_at = new Date().toISOString();
      if (status === 'bounced') updates.bounced_at = new Date().toISOString();
      if (status === 'failed') updates.failed_at = new Date().toISOString();

      if (metadata) {
        updates.metadata = metadata;
      }

      const { error } = await supabase
        .from('email_sends')
        .update(updates)
        .eq('id', emailSendId);

      return !error;
    } catch (error) {
      console.error('Failed to update email status:', error);
      return false;
    }
  }
}

// ============================================================================
// LIFECYCLE EMAIL TRIGGERS
// ============================================================================

export class LifecycleEmailTriggers {
  private emailService: LifecycleEmailService;

  constructor() {
    this.emailService = new LifecycleEmailService();
  }

  /**
   * Get tenant ID from workspace
   * Helper to fetch tenant_id for email branding
   */
  private async getTenantIdFromWorkspace(workspaceId: string): Promise<string | null> {
    try {
      const supabase = await createClient();
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('tenant_id')
        .eq('id', workspaceId)
        .single();

      return workspace?.tenant_id || null;
    } catch (error) {
      console.warn('Could not fetch tenant_id from workspace:', error);
      return null;
    }
  }

  /**
   * Activation Email
   * Trigger: 24h after user signup with no activity
   */
  async sendActivationEmail(userId: string): Promise<EmailSendResult> {
    const supabase = await createClient();

    // Get user details
    const { data: user } = await supabase.auth.admin.getUserById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('owner_id', userId)
      .single();

    if (!workspace) {
      return { success: false, error: 'Workspace not found' };
    }

    // Check if user has created any books
    const { data: books } = await supabase
      .from('books')
      .select('id')
      .eq('workspace_id', workspace.id)
      .limit(1);

    // Only send if no books created
    if (books && books.length > 0) {
      return { success: false, error: 'User already active' };
    }

    // Get tenant ID for branding
    const tenantId = await this.getTenantIdFromWorkspace(workspace.id);

    return this.emailService.sendEmail({
      userId,
      workspaceId: workspace.id,
      templateKey: 'activation_nudge',
      toEmail: user.user?.email!,
      toName: user.user?.user_metadata?.full_name,
      variables: {
        first_name: user.user?.user_metadata?.full_name?.split(' ')[0] || 'there',
        workspace_name: workspace.name,
      },
      triggerEvent: 'user_inactive_24h',
      tenantId,
    });
  }

  /**
   * Stalled Writer Email
   * Trigger: User hasn't written in 7 days
   */
  async sendStalledWriterEmail(userId: string): Promise<EmailSendResult> {
    const supabase = await createClient();

    // Get user details
    const { data: user } = await supabase.auth.admin.getUserById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get most recent book
    const { data: books } = await supabase
      .from('books')
      .select('id, title, workspace_id, updated_at')
      .eq('workspace_id', user.user?.user_metadata?.workspace_id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!books || books.length === 0) {
      return { success: false, error: 'No books found' };
    }

    const book = books[0];

    // Get word count
    const { data: chapters } = await supabase
      .from('chapters')
      .select('word_count')
      .eq('book_id', book.id);

    const totalWords = chapters?.reduce((sum, ch) => sum + (ch.word_count || 0), 0) || 0;

    return this.emailService.sendEmail({
      userId,
      workspaceId: book.workspace_id,
      templateKey: 'stalled_writer',
      toEmail: user.user?.email!,
      toName: user.user?.user_metadata?.full_name,
      variables: {
        first_name: user.user?.user_metadata?.full_name?.split(' ')[0] || 'there',
        book_title: book.title,
        word_count: totalWords.toLocaleString(),
      },
      triggerEvent: 'user_inactive_7d',
      metadata: { book_id: book.id },
    });
  }

  /**
   * Proof Push Email
   * Trigger: PDF generated but no order placed (3 days)
   */
  async sendProofPushEmail(userId: string, bookId: string): Promise<EmailSendResult> {
    const supabase = await createClient();

    // Get user details
    const { data: user } = await supabase.auth.admin.getUserById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get book and latest rendition
    const { data: book } = await supabase
      .from('books')
      .select('id, title, workspace_id')
      .eq('id', bookId)
      .single();

    if (!book) {
      return { success: false, error: 'Book not found' };
    }

    const { data: rendition } = await supabase
      .from('renditions')
      .select('id, interior_pdf_url, created_at')
      .eq('book_id', bookId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!rendition) {
      return { success: false, error: 'No completed rendition found' };
    }

    // Check if order exists for this book
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('book_id', bookId)
      .limit(1);

    if (orders && orders.length > 0) {
      return { success: false, error: 'Order already placed' };
    }

    return this.emailService.sendEmail({
      userId,
      workspaceId: book.workspace_id,
      templateKey: 'proof_push',
      toEmail: user.user?.email!,
      toName: user.user?.user_metadata?.full_name,
      variables: {
        first_name: user.user?.user_metadata?.full_name?.split(' ')[0] || 'there',
        book_title: book.title,
        pdf_ready_days: Math.floor(
          (Date.now() - new Date(rendition.created_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
      triggerEvent: 'rendition_complete_no_order_3d',
      metadata: { book_id: bookId, rendition_id: rendition.id },
    });
  }

  /**
   * Post-Delivery Email
   * Trigger: Order delivered (7 days after delivery)
   */
  async sendPostDeliveryEmail(userId: string, orderId: string): Promise<EmailSendResult> {
    const supabase = await createClient();

    // Get user details
    const { data: user } = await supabase.auth.admin.getUserById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('id, workspace_id, book_id, status')
      .eq('id', orderId)
      .single();

    if (!order || order.status !== 'delivered') {
      return { success: false, error: 'Order not delivered' };
    }

    // Get book details
    const { data: book } = await supabase
      .from('books')
      .select('title')
      .eq('id', order.book_id)
      .single();

    return this.emailService.sendEmail({
      userId,
      workspaceId: order.workspace_id,
      templateKey: 'post_delivery',
      toEmail: user.user?.email!,
      toName: user.user?.user_metadata?.full_name,
      variables: {
        first_name: user.user?.user_metadata?.full_name?.split(' ')[0] || 'there',
        book_title: book?.title || 'your book',
        order_number: orderId.slice(0, 8).toUpperCase(),
      },
      triggerEvent: 'order_delivered_7d',
      metadata: { order_id: orderId },
    });
  }

  /**
   * First Draft Complete Email
   * Trigger: User reaches 10,000 words
   */
  async sendFirstDraftCompleteEmail(
    userId: string,
    bookId: string
  ): Promise<EmailSendResult> {
    const supabase = await createClient();

    // Get user details
    const { data: user } = await supabase.auth.admin.getUserById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get book details
    const { data: book } = await supabase
      .from('books')
      .select('id, title, workspace_id')
      .eq('id', bookId)
      .single();

    if (!book) {
      return { success: false, error: 'Book not found' };
    }

    // Get word count
    const { data: chapters } = await supabase
      .from('chapters')
      .select('word_count')
      .eq('book_id', bookId);

    const totalWords = chapters?.reduce((sum, ch) => sum + (ch.word_count || 0), 0) || 0;

    return this.emailService.sendEmail({
      userId,
      workspaceId: book.workspace_id,
      templateKey: 'first_draft_complete',
      toEmail: user.user?.email!,
      toName: user.user?.user_metadata?.full_name,
      variables: {
        first_name: user.user?.user_metadata?.full_name?.split(' ')[0] || 'there',
        book_title: book.title,
        word_count: totalWords.toLocaleString(),
      },
      triggerEvent: 'book_milestone_10000_words',
      metadata: { book_id: bookId, word_count: totalWords },
    });
  }

  /**
   * Order Confirmation Email
   * Trigger: Immediate after order placed
   */
  async sendOrderConfirmationEmail(
    userId: string,
    orderId: string
  ): Promise<EmailSendResult> {
    const supabase = await createClient();

    // Get user details
    const { data: user } = await supabase.auth.admin.getUserById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('*, books(title)')
      .eq('id', orderId)
      .single();

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    return this.emailService.sendEmail({
      userId,
      workspaceId: order.workspace_id,
      templateKey: 'order_confirmation',
      toEmail: user.user?.email!,
      toName: user.user?.user_metadata?.full_name,
      variables: {
        first_name: user.user?.user_metadata?.full_name?.split(' ')[0] || 'there',
        order_number: orderId.slice(0, 8).toUpperCase(),
        book_title: order.books?.title || 'your book',
        total_amount: `$${(order.total_price / 100).toFixed(2)}`,
        shipping_address: order.shipping_address || 'your address',
      },
      triggerEvent: 'order_placed',
      metadata: { order_id: orderId },
    });
  }

  /**
   * Order Shipped Email
   * Trigger: When order status changes to 'shipped'
   */
  async sendOrderShippedEmail(
    userId: string,
    orderId: string
  ): Promise<EmailSendResult> {
    const supabase = await createClient();

    // Get user details
    const { data: user } = await supabase.auth.admin.getUserById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('*, books(title)')
      .eq('id', orderId)
      .single();

    if (!order || order.status !== 'shipped') {
      return { success: false, error: 'Order not shipped' };
    }

    return this.emailService.sendEmail({
      userId,
      workspaceId: order.workspace_id,
      templateKey: 'order_shipped',
      toEmail: user.user?.email!,
      toName: user.user?.user_metadata?.full_name,
      variables: {
        first_name: user.user?.user_metadata?.full_name?.split(' ')[0] || 'there',
        order_number: orderId.slice(0, 8).toUpperCase(),
        book_title: order.books?.title || 'your book',
        tracking_number: order.tracking_number || 'Not available',
        carrier: order.carrier || 'your carrier',
      },
      triggerEvent: 'order_shipped',
      metadata: { order_id: orderId },
    });
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const lifecycleEmailService = new LifecycleEmailService();
export const lifecycleEmailTriggers = new LifecycleEmailTriggers();
