/**
 * Peecho Print Provider Adapter
 * https://www.peecho.com/
 */

import { BasePrintAdapter } from "../adapter";
import type {
  BookSpec,
  PrintOrder,
  Quote,
  QuoteRequest,
  TrackingInfo,
  PreflightResult,
} from "../types";

export class PeechoAdapter extends BasePrintAdapter {
  readonly providerId = "peecho";
  readonly providerName = "Peecho";

  private apiKey: string;
  private baseUrl = "https://api.peecho.com/v1";

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  supportsSpec(spec: BookSpec): boolean {
    // Peecho supports most standard trim sizes and bindings
    const supportedTrims = ["5x8", "5.5x8.5", "6x9", "7x10", "8x10", "8.5x11"];
    const supportedBindings = ["perfect_bound", "saddle_stitch", "case_wrap"];

    return (
      supportedTrims.includes(spec.trimSize) &&
      supportedBindings.includes(spec.binding)
    );
  }

  async getQuote(request: QuoteRequest): Promise<Quote> {
    this.log("getQuote", { request });

    // Stub implementation - would call Peecho API
    const baseCost = 5.0 + request.bookSpec.pageCount * 0.02;
    const shippingCost = request.shippingMethod === "express" ? 12.0 : 5.0;

    return {
      providerId: this.providerId,
      providerName: this.providerName,
      costBreakdown: {
        printingCost: baseCost * request.quantity,
        shippingCost,
        handlingFee: 1.5,
        tax: 0,
        total: baseCost * request.quantity + shippingCost + 1.5,
        currency: "USD",
      },
      estimatedProductionDays: 3,
      estimatedShippingDays: request.shippingMethod === "express" ? 3 : 7,
      estimatedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      available: true,
    };
  }

  async preflight(spec: BookSpec): Promise<PreflightResult> {
    this.log("preflight", { spec });

    // Stub - would validate PDFs against Peecho requirements
    return {
      passed: true,
      errors: [],
      warnings: [],
    };
  }

  async submitOrder(order: PrintOrder): Promise<{ externalId: string; status: string }> {
    this.log("submitOrder", { orderId: order.id });

    // Stub - would submit to Peecho API
    return {
      externalId: `peecho_${Date.now()}`,
      status: "submitted",
    };
  }

  async getOrderStatus(externalId: string): Promise<{ status: string; trackingInfo?: TrackingInfo }> {
    this.log("getOrderStatus", { externalId });

    // Stub - would fetch from Peecho API
    return {
      status: "in_production",
    };
  }

  async cancelOrder(externalId: string): Promise<{ success: boolean; message?: string }> {
    this.log("cancelOrder", { externalId });

    // Stub - would call Peecho cancel API
    return {
      success: true,
      message: "Order cancelled successfully",
    };
  }

  async handleWebhook(payload: unknown): Promise<{ orderId: string; status: string; trackingInfo?: TrackingInfo }> {
    this.log("handleWebhook", { payload });

    // Stub - would parse Peecho webhook payload
    return {
      orderId: "unknown",
      status: "unknown",
    };
  }

  protected mapStatus(providerStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: "submitted",
      processing: "in_production",
      shipped: "shipped",
      delivered: "delivered",
      cancelled: "cancelled",
    };
    return statusMap[providerStatus] || providerStatus;
  }
}
