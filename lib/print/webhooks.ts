/**
 * Print Provider Webhook Utilities
 * Feature: BS-603
 *
 * Utilities for validating and processing print provider webhooks
 */

import crypto from 'crypto';

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate webhook signature from Prodigi
 */
export function validateProdigiWebhook(
  body: string,
  signature: string,
  secret: string
): WebhookValidationResult {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    return {
      isValid,
      error: isValid ? undefined : 'Invalid signature'
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Signature validation failed'
    };
  }
}

/**
 * Validate webhook signature from Gelato
 */
export function validateGelatoWebhook(
  body: string,
  signature: string,
  secret: string
): WebhookValidationResult {
  // Gelato uses similar HMAC-SHA256 signature
  return validateProdigiWebhook(body, signature, secret);
}

/**
 * Validate webhook signature from Lulu
 */
export function validateLuluWebhook(
  body: string,
  signature: string,
  secret: string
): WebhookValidationResult {
  try {
    // Lulu uses HMAC-SHA1
    const expectedSignature = crypto
      .createHmac('sha1', secret)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    return {
      isValid,
      error: isValid ? undefined : 'Invalid signature'
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Signature validation failed'
    };
  }
}

/**
 * Generic webhook validation router
 */
export function validateWebhookSignature(
  provider: string,
  body: string,
  signature: string,
  secret: string
): WebhookValidationResult {
  switch (provider.toLowerCase()) {
    case 'prodigi':
      return validateProdigiWebhook(body, signature, secret);
    case 'gelato':
      return validateGelatoWebhook(body, signature, secret);
    case 'lulu':
      return validateLuluWebhook(body, signature, secret);
    default:
      return {
        isValid: false,
        error: `Unknown provider: ${provider}`
      };
  }
}

/**
 * Parse webhook event type
 */
export function parseWebhookEvent(provider: string, payload: any): string {
  switch (provider.toLowerCase()) {
    case 'prodigi':
      return payload.event || 'unknown';
    case 'gelato':
      return payload.type || 'unknown';
    case 'lulu':
      return payload.event_type || 'unknown';
    default:
      return 'unknown';
  }
}

/**
 * Extract order ID from webhook payload
 */
export function extractOrderId(provider: string, payload: any): string | null {
  switch (provider.toLowerCase()) {
    case 'prodigi':
      return payload.orderId || payload.order?.id || null;
    case 'gelato':
      return payload.orderId || payload.data?.orderId || null;
    case 'lulu':
      return payload.order_id || payload.data?.order_id || null;
    default:
      return null;
  }
}
