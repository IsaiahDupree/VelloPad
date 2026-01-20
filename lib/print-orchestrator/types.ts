/**
 * Print Orchestrator Types
 * Canonical data models for multi-provider POD integration
 */

export type TrimSize =
  | "5x8"
  | "5.5x8.5"
  | "6x9"
  | "7x10"
  | "8x10"
  | "8.5x11"
  | "custom";

export type BindingType =
  | "perfect_bound"
  | "saddle_stitch"
  | "case_wrap"
  | "coil"
  | "wire_o";

export type PaperType =
  | "white_60lb"
  | "white_70lb"
  | "cream_60lb"
  | "cream_70lb"
  | "glossy_80lb"
  | "matte_80lb";

export type CoverFinish = "matte" | "gloss" | "soft_touch";

export type ColorMode = "bw" | "standard_color" | "premium_color";

export interface BookSpec {
  id: string;
  title: string;
  interiorPdfUrl: string;
  coverPdfUrl: string;
  pageCount: number;
  trimSize: TrimSize;
  customTrimSize?: { width: number; height: number; unit: "in" | "mm" };
  binding: BindingType;
  paper: PaperType;
  coverFinish: CoverFinish;
  colorMode: ColorMode;
  isbn?: string;
}

export interface ShippingAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export type ShippingMethod = "standard" | "express" | "priority";

export interface PrintOrder {
  id: string;
  externalId?: string;
  userId: string;
  bookSpec: BookSpec;
  quantity: number;
  shippingAddress: ShippingAddress;
  shippingMethod: ShippingMethod;
  providerId: string;
  status: PrintOrderStatus;
  costBreakdown?: CostBreakdown;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export type PrintOrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "submitted"
  | "accepted"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "failed";

export interface CostBreakdown {
  printingCost: number;
  shippingCost: number;
  handlingFee: number;
  tax: number;
  total: number;
  currency: string;
}

export interface QuoteRequest {
  bookSpec: BookSpec;
  quantity: number;
  shippingAddress: ShippingAddress;
  shippingMethod: ShippingMethod;
}

export interface Quote {
  providerId: string;
  providerName: string;
  costBreakdown: CostBreakdown;
  estimatedProductionDays: number;
  estimatedShippingDays: number;
  estimatedDeliveryDate: Date;
  expiresAt: Date;
  available: boolean;
  unavailableReason?: string;
}

export interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  status: string;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: Date;
  location?: string;
  description: string;
  status: string;
}

export interface PreflightResult {
  passed: boolean;
  errors: PreflightIssue[];
  warnings: PreflightIssue[];
}

export interface PreflightIssue {
  code: string;
  message: string;
  page?: number;
  severity: "error" | "warning";
  suggestion?: string;
}
