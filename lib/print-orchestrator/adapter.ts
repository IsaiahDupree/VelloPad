/**
 * Print Provider Adapter Interface
 * Abstract base for POD provider integrations
 */

import type {
  BookSpec,
  PrintOrder,
  Quote,
  QuoteRequest,
  TrackingInfo,
  PreflightResult,
} from "./types";

export interface PrintProviderAdapter {
  /**
   * Unique identifier for this provider
   */
  readonly providerId: string;

  /**
   * Human-readable provider name
   */
  readonly providerName: string;

  /**
   * Check if the provider supports the given book specification
   */
  supportsSpec(spec: BookSpec): boolean;

  /**
   * Get a price quote for the given request
   */
  getQuote(request: QuoteRequest): Promise<Quote>;

  /**
   * Run preflight checks on the book files
   */
  preflight(spec: BookSpec): Promise<PreflightResult>;

  /**
   * Submit an order to the provider
   */
  submitOrder(order: PrintOrder): Promise<{
    externalId: string;
    status: string;
  }>;

  /**
   * Get the current status of an order
   */
  getOrderStatus(externalId: string): Promise<{
    status: string;
    trackingInfo?: TrackingInfo;
  }>;

  /**
   * Cancel an order if possible
   */
  cancelOrder(externalId: string): Promise<{
    success: boolean;
    message?: string;
  }>;

  /**
   * Handle incoming webhooks from the provider
   */
  handleWebhook(payload: unknown): Promise<{
    orderId: string;
    status: string;
    trackingInfo?: TrackingInfo;
  }>;
}

/**
 * Base adapter with common functionality
 */
export abstract class BasePrintAdapter implements PrintProviderAdapter {
  abstract readonly providerId: string;
  abstract readonly providerName: string;

  abstract supportsSpec(spec: BookSpec): boolean;
  abstract getQuote(request: QuoteRequest): Promise<Quote>;
  abstract preflight(spec: BookSpec): Promise<PreflightResult>;
  abstract submitOrder(order: PrintOrder): Promise<{ externalId: string; status: string }>;
  abstract getOrderStatus(externalId: string): Promise<{ status: string; trackingInfo?: TrackingInfo }>;
  abstract cancelOrder(externalId: string): Promise<{ success: boolean; message?: string }>;
  abstract handleWebhook(payload: unknown): Promise<{ orderId: string; status: string; trackingInfo?: TrackingInfo }>;

  /**
   * Convert internal status to provider-specific status
   */
  protected abstract mapStatus(providerStatus: string): string;

  /**
   * Log provider interactions for debugging
   */
  protected log(action: string, data: unknown) {
    console.log(`[${this.providerId}] ${action}:`, JSON.stringify(data, null, 2));
  }
}
