/**
 * Print Orchestrator
 * Routes orders to optimal POD provider with fallback support
 */

import type { PrintProviderAdapter } from "./adapter";
import type {
  BookSpec,
  PrintOrder,
  Quote,
  QuoteRequest,
} from "./types";

export * from "./types";
export * from "./adapter";

interface OrchestratorConfig {
  adapters: PrintProviderAdapter[];
  preferredProvider?: string;
  enableFallback?: boolean;
}

export class PrintOrchestrator {
  private adapters: Map<string, PrintProviderAdapter> = new Map();
  private preferredProvider?: string;
  private enableFallback: boolean;

  constructor(config: OrchestratorConfig) {
    for (const adapter of config.adapters) {
      this.adapters.set(adapter.providerId, adapter);
    }
    this.preferredProvider = config.preferredProvider;
    this.enableFallback = config.enableFallback ?? true;
  }

  /**
   * Get all available providers for a book specification
   */
  getAvailableProviders(spec: BookSpec): PrintProviderAdapter[] {
    return Array.from(this.adapters.values()).filter((adapter) =>
      adapter.supportsSpec(spec)
    );
  }

  /**
   * Get quotes from all available providers
   */
  async getAllQuotes(request: QuoteRequest): Promise<Quote[]> {
    const providers = this.getAvailableProviders(request.bookSpec);
    const quotePromises = providers.map((provider) =>
      provider.getQuote(request).catch((error) => {
        console.error(`Quote failed for ${provider.providerId}:`, error);
        return null;
      })
    );

    const quotes = await Promise.all(quotePromises);
    return quotes.filter((q): q is Quote => q !== null && q.available);
  }

  /**
   * Get the best quote based on cost and delivery time
   */
  async getBestQuote(
    request: QuoteRequest,
    preference: "cost" | "speed" = "cost"
  ): Promise<Quote | null> {
    const quotes = await this.getAllQuotes(request);

    if (quotes.length === 0) return null;

    // Sort by preference
    if (preference === "cost") {
      quotes.sort((a, b) => a.costBreakdown.total - b.costBreakdown.total);
    } else {
      quotes.sort(
        (a, b) =>
          a.estimatedProductionDays +
          a.estimatedShippingDays -
          (b.estimatedProductionDays + b.estimatedShippingDays)
      );
    }

    // Prefer the configured provider if it's competitive
    if (this.preferredProvider) {
      const preferredQuote = quotes.find(
        (q) => q.providerId === this.preferredProvider
      );
      if (preferredQuote) {
        const bestQuote = quotes[0];
        const threshold = 1.1; // 10% tolerance
        if (preferredQuote.costBreakdown.total <= bestQuote.costBreakdown.total * threshold) {
          return preferredQuote;
        }
      }
    }

    return quotes[0];
  }

  /**
   * Submit an order to the specified provider
   */
  async submitOrder(order: PrintOrder): Promise<{
    success: boolean;
    externalId?: string;
    error?: string;
  }> {
    const adapter = this.adapters.get(order.providerId);

    if (!adapter) {
      return { success: false, error: `Unknown provider: ${order.providerId}` };
    }

    try {
      const result = await adapter.submitOrder(order);
      return { success: true, externalId: result.externalId };
    } catch (error) {
      console.error(`Order submission failed for ${order.providerId}:`, error);

      // Try fallback if enabled
      if (this.enableFallback) {
        const fallbackProvider = this.getFallbackProvider(
          order.providerId,
          order.bookSpec
        );
        if (fallbackProvider) {
          console.log(`Trying fallback provider: ${fallbackProvider.providerId}`);
          try {
            const fallbackResult = await fallbackProvider.submitOrder({
              ...order,
              providerId: fallbackProvider.providerId,
            });
            return { success: true, externalId: fallbackResult.externalId };
          } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError);
          }
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get a fallback provider
   */
  private getFallbackProvider(
    excludeId: string,
    spec: BookSpec
  ): PrintProviderAdapter | null {
    for (const [id, adapter] of this.adapters) {
      if (id !== excludeId && adapter.supportsSpec(spec)) {
        return adapter;
      }
    }
    return null;
  }

  /**
   * Get order status from the appropriate provider
   */
  async getOrderStatus(providerId: string, externalId: string) {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    return adapter.getOrderStatus(externalId);
  }

  /**
   * Run preflight on all available providers
   */
  async preflight(spec: BookSpec) {
    const providers = this.getAvailableProviders(spec);
    const results = await Promise.all(
      providers.map(async (provider) => ({
        providerId: provider.providerId,
        result: await provider.preflight(spec),
      }))
    );
    return results;
  }
}

// Factory function for creating orchestrator with configured adapters
export function createPrintOrchestrator(): PrintOrchestrator {
  // Import adapters dynamically to avoid circular dependencies
  // In production, this would load based on environment config
  console.log("[PrintOrchestrator] Initializing with stub adapters");

  return new PrintOrchestrator({
    adapters: [],
    enableFallback: true,
  });
}
