/**
 * Audit Logging Service
 * Feature: BS-902 - Commerce + provider audit logs (PII redaction)
 *
 * Provides utilities for logging audit events with automatic PII redaction
 * for compliance with privacy regulations (GDPR, CCPA, etc.)
 */

import { createClient } from '@/lib/supabase/server'

export type AuditEventType =
  | 'stripe_webhook'
  | 'prodigi_webhook'
  | 'gelato_webhook'
  | 'lulu_webhook'
  | 'peecho_webhook'
  | 'order_created'
  | 'order_updated'
  | 'payment_success'
  | 'payment_failure'
  | 'refund_issued'
  | 'admin_action'

export interface AuditLog {
  event_type: AuditEventType
  provider?: string
  event_name: string
  order_id?: string
  user_id?: string
  workspace_id?: string
  raw_payload?: Record<string, any>
  sanitized_payload: Record<string, any>
  status: 'success' | 'failure' | 'pending'
  error_message?: string
  ip_address?: string
  user_agent?: string
  timestamp: Date
  metadata?: Record<string, any>
}

/**
 * PII field patterns to redact
 */
const PII_PATTERNS = {
  EMAIL: /^.*email.*$/i,
  PHONE: /^.*(phone|mobile|tel).*$/i,
  NAME: /^.*(name|first_name|last_name|full_name|customer_name).*$/i,
  ADDRESS: /^.*(address|street|line1|line2|address_line).*$/i,
  IP: /^.*(ip|ip_address|client_ip|source_ip).*$/i,
  CARD: /^.*(card_number|credit_card|debit_card|pan).*$/i,
  SSN: /^.*(ssn|social_security).*$/i,
  TAX_ID: /^.*(tax_id|ein|vat).*$/i,
}

/**
 * Fields that should be preserved (not redacted)
 */
const PRESERVED_FIELDS = new Set([
  'id',
  'order_id',
  'orderId',
  'provider_order_id',
  'transaction_id',
  'event',
  'type',
  'status',
  'amount',
  'amount_total',
  'currency',
  'currency_code',
  'timestamp',
  'created',
  'created_at',
  'updated_at',
  'shipped_at',
  'delivered_at',
  'metadata',
  'sku',
  'product_id',
  'book_id',
  'rendition_id',
  'quote_id',
  'workspace_id',
  'user_id',
  'quantity',
  'copies',
  'provider',
  'event_name',
  'last4', // Card last 4 digits
  'exp_month',
  'exp_year',
  'brand',
  'city',
  'state',
  'stateOrCounty',
  'postal_code',
  'postalOrZipCode',
  'postal',
  'country',
  'country_code',
  'countryCode',
  'townOrCity',
  'stage',
  'issues',
  'items',
  'tags',
])

/**
 * Recursively redact PII from an object
 */
export function redactPII(data: any): any {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => redactPII(item))
  }

  const redacted: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    // Skip null, undefined, or empty string values
    if (value === null || value === undefined || value === '') {
      redacted[key] = value
      continue
    }

    // Preserve explicitly whitelisted fields
    if (PRESERVED_FIELDS.has(key)) {
      redacted[key] = typeof value === 'object' ? redactPII(value) : value
      continue
    }

    // Check for PII patterns
    if (PII_PATTERNS.EMAIL.test(key)) {
      redacted[key] = '[REDACTED_EMAIL]'
    } else if (PII_PATTERNS.PHONE.test(key)) {
      redacted[key] = '[REDACTED_PHONE]'
    } else if (PII_PATTERNS.NAME.test(key)) {
      redacted[key] = '[REDACTED_NAME]'
    } else if (PII_PATTERNS.ADDRESS.test(key)) {
      redacted[key] = '[REDACTED_ADDRESS]'
    } else if (PII_PATTERNS.IP.test(key)) {
      redacted[key] = '[REDACTED_IP]'
    } else if (PII_PATTERNS.CARD.test(key)) {
      redacted[key] = '[REDACTED_CARD]'
    } else if (PII_PATTERNS.SSN.test(key)) {
      redacted[key] = '[REDACTED_SSN]'
    } else if (PII_PATTERNS.TAX_ID.test(key)) {
      redacted[key] = '[REDACTED_TAX_ID]'
    } else if (typeof value === 'object') {
      // Recursively redact nested objects
      redacted[key] = redactPII(value)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Sanitize webhook payload based on provider
 */
export function sanitizeWebhookPayload(
  provider: string,
  payload: Record<string, any>
): Record<string, any> {
  // Apply generic PII redaction
  return redactPII(payload)
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(
  log: Omit<AuditLog, 'timestamp' | 'sanitized_payload'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Sanitize the payload
    const sanitized_payload = log.raw_payload
      ? sanitizeWebhookPayload(log.provider || 'unknown', log.raw_payload)
      : {}

    // Create audit log entry
    const { error } = await supabase.from('audit_logs').insert({
      event_type: log.event_type,
      provider: log.provider,
      event_name: log.event_name,
      order_id: log.order_id,
      user_id: log.user_id,
      workspace_id: log.workspace_id,
      raw_payload: log.raw_payload,
      sanitized_payload,
      status: log.status,
      error_message: log.error_message,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      metadata: log.metadata,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Failed to log audit event:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Exception while logging audit event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Log a webhook event
 */
export async function logWebhookEvent(params: {
  provider: string
  eventType: string
  orderId?: string
  payload: Record<string, any>
  status: 'success' | 'failure'
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
}): Promise<{ success: boolean; error?: string }> {
  return logAuditEvent({
    event_type: `${params.provider}_webhook` as AuditEventType,
    provider: params.provider,
    event_name: params.eventType,
    order_id: params.orderId,
    raw_payload: params.payload,
    status: params.status,
    error_message: params.errorMessage,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
  })
}

/**
 * Log an admin action
 */
export async function logAdminAction(params: {
  action: string
  userId: string
  workspaceId?: string
  orderId?: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}): Promise<{ success: boolean; error?: string }> {
  return logAuditEvent({
    event_type: 'admin_action',
    event_name: params.action,
    user_id: params.userId,
    workspace_id: params.workspaceId,
    order_id: params.orderId,
    raw_payload: params.details,
    status: 'success',
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
  })
}

/**
 * Retrieve audit logs for an order
 */
export async function getOrderAuditLogs(
  orderId: string
): Promise<{ logs: any[]; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) {
      return { logs: [], error: error.message }
    }

    return { logs: data || [] }
  } catch (error) {
    return {
      logs: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Retrieve audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit = 100
): Promise<{ logs: any[]; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { logs: [], error: error.message }
    }

    return { logs: data || [] }
  } catch (error) {
    return {
      logs: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
