/**
 * Lulu Print Provider Adapter
 * https://www.lulu.com/
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

export class LuluAdapter extends BasePrintAdapter {
  readonly providerId = "lulu";
  readonly providerName = "Lulu";

  private apiKey: string;
  private baseUrl = "https://api.lulu.com/v1";

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  supportsSpec(spec: BookSpec): boolean {
    // Lulu has broad support for various formats
    const supportedBindings = ["perfect_bound", "saddle_stitch", "case_wrap", "coil"];
    return supportedBindings.includes(spec.binding);
  }

  async getQuote(request: QuoteRequest): Promise<Quote> {
    this.log("getQuote", { request });

    // Stub implementation
    const baseCost = 4.5 + request.bookSpec.pageCount * 0.018;
    const shippingCost = request.shippingMethod === "express" ? 14.0 : 6.0;

    return {
      providerId: this.providerId,
      providerName: this.providerName,
      costBreakdown: {
        printingCost: baseCost * request.quantity,
        shippingCost,
        handlingFee: 2.0,
        tax: 0,
        total: baseCost * request.quantity + shippingCost + 2.0,
        currency: "USD",
      },
      estimatedProductionDays: 4,
      estimatedShippingDays: request.shippingMethod === "express" ? 2 : 5,
      estimatedDeliveryDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      available: true,
    };
  }

  async preflight(spec: BookSpec): Promise<PreflightResult> {
    this.log("preflight", { spec });
    return { passed: true, errors: [], warnings: [] };
  }

  async submitOrder(order: PrintOrder): Promise<{ externalId: string; status: string }> {
    this.log("submitOrder", { orderId: order.id });
    return { externalId: `lulu_${Date.now()}`, status: "submitted" };
  }

  async getOrderStatus(externalId: string): Promise<{ status: string; trackingInfo?: TrackingInfo }> {
    this.log("getOrderStatus", { externalId });
    return { status: "in_production" };
  }

  async cancelOrder(externalId: string): Promise<{ success: boolean; message?: string }> {
    this.log("cancelOrder", { externalId });
    return { success: true };
  }

  async handleWebhook(payload: unknown): Promise<{ orderId: string; status: string }> {
    this.log("handleWebhook", { payload });
    return { orderId: "unknown", status: "unknown" };
  }

  protected mapStatus(providerStatus: string): string {
    const statusMap: Record<string, string> = {
      CREATED: "submitted",
      MANUFACTURING: "in_production",
      SHIPPED: "shipped",
      DELIVERED: "delivered",
      CANCELED: "cancelled",
    };
    return statusMap[providerStatus] || providerStatus;
  }
}
