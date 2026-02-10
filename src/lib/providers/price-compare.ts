/**
 * Multi-Provider Price Comparison
 * Feature: PB-033
 *
 * Compare prices across multiple print providers
 */

import { ProdigiAdapter } from './prodigi/adapter';
import { GelatoAdapter } from './gelato/adapter';
import type { QuoteRequest, QuoteResponse } from './types';

export interface ProviderQuote extends QuoteResponse {
  providerId: string;
  providerName: string;
}

export interface PriceComparison {
  quotes: ProviderQuote[];
  cheapest: ProviderQuote | null;
  fastest: ProviderQuote | null;
  recommended: ProviderQuote | null;
}

export interface ComparisonOptions {
  includeShipping?: boolean;
  preferredCurrency?: string;
  maxDeliveryDays?: number;
  minQualityScore?: number;
}

/**
 * Price Comparison Service
 */
export class PriceComparisonService {
  private providers: Array<{
    id: string;
    name: string;
    adapter: any;
    enabled: boolean;
    qualityScore?: number;
  }> = [];

  constructor() {
    // Initialize available providers
    this.providers = [
      {
        id: 'prodigi',
        name: 'Prodigi',
        adapter: new ProdigiAdapter(),
        enabled: true,
        qualityScore: 9,
      },
      {
        id: 'gelato',
        name: 'Gelato',
        adapter: new GelatoAdapter(),
        enabled: true,
        qualityScore: 9,
      },
      // Add more providers as they become available
    ];
  }

  /**
   * Get quotes from all enabled providers
   */
  async getQuotes(
    request: QuoteRequest,
    options: ComparisonOptions = {}
  ): Promise<ProviderQuote[]> {
    const { minQualityScore = 0 } = options;

    // Filter providers by quality score
    const eligibleProviders = this.providers.filter(
      (p) => p.enabled && (p.qualityScore || 0) >= minQualityScore
    );

    // Get quotes from all providers in parallel
    const quotePromises = eligibleProviders.map(async (provider) => {
      try {
        const quote = await provider.adapter.quote(request);
        return {
          ...quote,
          providerId: provider.id,
          providerName: provider.name,
        };
      } catch (error) {
        console.error(`Failed to get quote from ${provider.name}:`, error);
        return null;
      }
    });

    const quotes = await Promise.all(quotePromises);

    // Filter out failed quotes
    return quotes.filter((q): q is ProviderQuote => q !== null);
  }

  /**
   * Compare prices across providers and recommend best option
   */
  async compare(
    request: QuoteRequest,
    options: ComparisonOptions = {}
  ): Promise<PriceComparison> {
    const quotes = await this.getQuotes(request, options);

    if (quotes.length === 0) {
      return {
        quotes: [],
        cheapest: null,
        fastest: null,
        recommended: null,
      };
    }

    // Find cheapest (by total cost)
    const cheapest = quotes.reduce((min, quote) =>
      quote.totalCost < min.totalCost ? quote : min
    );

    // Find fastest (by estimated delivery time)
    const fastest = quotes.reduce((min, quote) => {
      const minDays = this.getEstimatedDays(min.estimatedDelivery);
      const quoteDays = this.getEstimatedDays(quote.estimatedDelivery);
      return quoteDays < minDays ? quote : min;
    });

    // Find recommended (balance of price, speed, and quality)
    const recommended = this.getRecommended(quotes, options);

    return {
      quotes,
      cheapest,
      fastest,
      recommended,
    };
  }

  /**
   * Get recommended provider based on multiple factors
   */
  private getRecommended(
    quotes: ProviderQuote[],
    options: ComparisonOptions
  ): ProviderQuote {
    // Score each quote
    const scored = quotes.map((quote) => {
      let score = 0;

      // Price score (lower is better, normalized to 0-100)
      const maxPrice = Math.max(...quotes.map((q) => q.totalCost));
      const priceScore = ((maxPrice - quote.totalCost) / maxPrice) * 100;
      score += priceScore * 0.4; // 40% weight

      // Delivery speed score (faster is better)
      const maxDays = Math.max(
        ...quotes.map((q) => this.getEstimatedDays(q.estimatedDelivery))
      );
      const days = this.getEstimatedDays(quote.estimatedDelivery);
      const speedScore = ((maxDays - days) / maxDays) * 100;
      score += speedScore * 0.3; // 30% weight

      // Quality score
      const provider = this.providers.find((p) => p.id === quote.providerId);
      const qualityScore = (provider?.qualityScore || 5) * 10; // Convert to 0-100 scale
      score += qualityScore * 0.3; // 30% weight

      return { quote, score };
    });

    // Return quote with highest score
    const best = scored.reduce((max, item) =>
      item.score > max.score ? item : max
    );

    return best.quote;
  }

  /**
   * Extract estimated delivery days from various formats
   */
  private getEstimatedDays(delivery: string): number {
    // Parse "X-Y business days" format
    const match = delivery.match(/(\d+)(?:-(\d+))?/);
    if (match) {
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : min;
      return (min + max) / 2; // Return average
    }
    return 999; // Default for unknown
  }

  /**
   * Format comparison for display
   */
  formatComparison(comparison: PriceComparison): string {
    const { quotes, cheapest, fastest, recommended } = comparison;

    if (quotes.length === 0) {
      return 'No quotes available';
    }

    const lines: string[] = [];
    lines.push(`Found ${quotes.length} available providers:\n`);

    quotes.forEach((quote) => {
      const badges: string[] = [];

      if (quote === cheapest) badges.push('💰 Cheapest');
      if (quote === fastest) badges.push('⚡ Fastest');
      if (quote === recommended) badges.push('⭐ Recommended');

      lines.push(
        `${quote.providerName}: ${quote.currency} ${quote.totalCost.toFixed(2)} | ${quote.estimatedDelivery}`
      );

      if (badges.length > 0) {
        lines.push(`  ${badges.join(' • ')}`);
      }

      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Get savings by choosing cheapest vs recommended
   */
  getSavings(comparison: PriceComparison): number {
    const { cheapest, recommended } = comparison;

    if (!cheapest || !recommended) return 0;

    return recommended.totalCost - cheapest.totalCost;
  }

  /**
   * Enable/disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    const provider = this.providers.find((p) => p.id === providerId);
    if (provider) {
      provider.enabled = enabled;
    }
  }

  /**
   * Get all available providers
   */
  getProviders() {
    return this.providers.map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      qualityScore: p.qualityScore,
    }));
  }
}

/**
 * Create a new price comparison service instance
 */
export function createPriceComparisonService(): PriceComparisonService {
  return new PriceComparisonService();
}

/**
 * Quick helper to compare prices for a single request
 */
export async function compareProviderPrices(
  request: QuoteRequest,
  options?: ComparisonOptions
): Promise<PriceComparison> {
  const service = createPriceComparisonService();
  return service.compare(request, options);
}
