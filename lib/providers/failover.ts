/**
 * Provider Failover System
 * Feature: PB-034
 *
 * Automatic failover when primary print provider is unavailable
 * - Health checks and circuit breakers
 * - Retry logic with exponential backoff
 * - Fallback to secondary providers
 */

import type {
  PrintProviderAdapter,
  QuoteRequest,
  QuoteResult,
  CreateOrderRequest,
  OrderResult,
  OrderStatusUpdate,
} from '@/lib/print/orchestrator'

// ============================================================================
// TYPES
// ============================================================================

export interface FailoverConfig {
  /** Enable health checking */
  healthCheckEnabled: boolean

  /** Health check interval in milliseconds */
  healthCheckInterval: number

  /** Circuit breaker failure threshold */
  circuitBreakerThreshold: number

  /** Circuit breaker reset timeout in milliseconds */
  circuitBreakerResetTimeout: number

  /** Retry configuration */
  retryEnabled: boolean
  retryAttempts: number
  retryBaseDelay: number // milliseconds
  retryMaxDelay: number // milliseconds

  /** Failover enabled */
  failoverEnabled: boolean
}

export interface ProviderHealth {
  providerId: string
  providerName: string
  healthy: boolean
  lastCheck: Date
  failureCount: number
  circuitOpen: boolean
  circuitOpenUntil?: Date
  lastError?: string
  responseTime?: number // milliseconds
}

export interface FailoverDecision {
  useProvider: string
  reason: string
  fallbackChain: string[]
  retriesAttempted: number
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: FailoverConfig = {
  healthCheckEnabled: true,
  healthCheckInterval: 60000, // 1 minute
  circuitBreakerThreshold: 3,
  circuitBreakerResetTimeout: 300000, // 5 minutes
  retryEnabled: true,
  retryAttempts: 3,
  retryBaseDelay: 1000, // 1 second
  retryMaxDelay: 30000, // 30 seconds
  failoverEnabled: true,
}

// ============================================================================
// FAILOVER SERVICE
// ============================================================================

export class ProviderFailoverService {
  private config: FailoverConfig
  private healthStatus: Map<string, ProviderHealth> = new Map()
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(config?: Partial<FailoverConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Register provider for health monitoring
   */
  registerProvider(adapter: PrintProviderAdapter): void {
    const health: ProviderHealth = {
      providerId: adapter.providerId,
      providerName: adapter.providerName,
      healthy: true,
      lastCheck: new Date(),
      failureCount: 0,
      circuitOpen: false,
    }

    this.healthStatus.set(adapter.providerId, health)

    if (this.config.healthCheckEnabled) {
      this.startHealthCheck(adapter)
    }

    console.log(`✅ Registered ${adapter.providerName} for failover monitoring`)
  }

  /**
   * Start periodic health checking
   */
  private startHealthCheck(adapter: PrintProviderAdapter): void {
    if (this.healthCheckIntervals.has(adapter.providerId)) {
      return
    }

    const interval = setInterval(async () => {
      await this.performHealthCheck(adapter)
    }, this.config.healthCheckInterval)

    this.healthCheckIntervals.set(adapter.providerId, interval)
  }

  /**
   * Stop health checking
   */
  stopHealthCheck(providerId: string): void {
    const interval = this.healthCheckIntervals.get(providerId)
    if (interval) {
      clearInterval(interval)
      this.healthCheckIntervals.delete(providerId)
    }
  }

  /**
   * Perform health check on provider
   */
  private async performHealthCheck(adapter: PrintProviderAdapter): Promise<void> {
    const health = this.healthStatus.get(adapter.providerId)
    if (!health) return

    try {
      const startTime = Date.now()

      // Check capabilities as health check
      await adapter.getCapabilities()

      const responseTime = Date.now() - startTime

      // Update health status
      health.healthy = true
      health.lastCheck = new Date()
      health.responseTime = responseTime
      health.circuitOpen = false
      health.failureCount = 0
      health.lastError = undefined

      console.log(`✅ Health check passed for ${adapter.providerName} (${responseTime}ms)`)
    } catch (error: any) {
      health.failureCount++
      health.lastCheck = new Date()
      health.lastError = error.message

      // Open circuit breaker if threshold exceeded
      if (health.failureCount >= this.config.circuitBreakerThreshold) {
        health.circuitOpen = true
        health.circuitOpenUntil = new Date(
          Date.now() + this.config.circuitBreakerResetTimeout
        )
        health.healthy = false

        console.error(
          `🔴 Circuit breaker opened for ${adapter.providerName} ` +
          `(${health.failureCount} failures)`
        )
      }

      console.error(`❌ Health check failed for ${adapter.providerName}:`, error.message)
    }
  }

  /**
   * Check if circuit breaker should be reset
   */
  private shouldResetCircuitBreaker(health: ProviderHealth): boolean {
    if (!health.circuitOpen || !health.circuitOpenUntil) {
      return false
    }

    return Date.now() >= health.circuitOpenUntil.getTime()
  }

  /**
   * Get provider health status
   */
  getProviderHealth(providerId: string): ProviderHealth | undefined {
    const health = this.healthStatus.get(providerId)

    if (health && this.shouldResetCircuitBreaker(health)) {
      health.circuitOpen = false
      health.circuitOpenUntil = undefined
      health.failureCount = 0
      console.log(`🟢 Circuit breaker reset for ${health.providerName}`)
    }

    return health
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): ProviderHealth[] {
    return Array.from(this.healthStatus.values())
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(providerId: string): boolean {
    const health = this.getProviderHealth(providerId)

    if (!health) {
      return true // Assume available if not monitored
    }

    if (health.circuitOpen) {
      // Check if circuit breaker should be reset
      if (this.shouldResetCircuitBreaker(health)) {
        return true
      }
      return false
    }

    return health.healthy
  }

  /**
   * Select best available provider from list
   */
  selectProvider(providerIds: string[]): FailoverDecision {
    const available = providerIds.filter(id => this.isProviderAvailable(id))

    if (available.length === 0) {
      return {
        useProvider: providerIds[0], // Fallback to first even if unhealthy
        reason: 'All providers unavailable, using primary despite circuit breaker',
        fallbackChain: providerIds,
        retriesAttempted: 0,
      }
    }

    const primary = available[0]
    const isPrimary = primary === providerIds[0]

    return {
      useProvider: primary,
      reason: isPrimary
        ? 'Using primary provider'
        : `Primary provider unavailable, using fallback: ${primary}`,
      fallbackChain: available,
      retriesAttempted: 0,
    }
  }

  /**
   * Execute operation with retry and failover
   */
  async executeWithFailover<T>(
    providers: PrintProviderAdapter[],
    operation: (adapter: PrintProviderAdapter) => Promise<T>,
    operationName: string
  ): Promise<{ result: T; decision: FailoverDecision }> {
    if (providers.length === 0) {
      throw new Error('No providers available')
    }

    const providerIds = providers.map(p => p.providerId)
    let decision = this.selectProvider(providerIds)
    let lastError: Error | null = null

    // Try each provider in fallback chain
    for (const providerId of decision.fallbackChain) {
      const adapter = providers.find(p => p.providerId === providerId)
      if (!adapter) continue

      // Try with retries
      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        try {
          const result = await operation(adapter)

          // Mark provider as healthy on success
          const health = this.healthStatus.get(providerId)
          if (health) {
            health.healthy = true
            health.failureCount = 0
            health.circuitOpen = false
          }

          decision.retriesAttempted = attempt

          if (attempt > 0) {
            console.log(
              `✅ ${operationName} succeeded for ${adapter.providerName} ` +
              `on attempt ${attempt + 1}`
            )
          }

          return { result, decision }
        } catch (error: any) {
          lastError = error
          decision.retriesAttempted = attempt

          // Record failure
          const health = this.healthStatus.get(providerId)
          if (health) {
            health.failureCount++
            health.lastError = error.message

            if (health.failureCount >= this.config.circuitBreakerThreshold) {
              health.circuitOpen = true
              health.circuitOpenUntil = new Date(
                Date.now() + this.config.circuitBreakerResetTimeout
              )
              health.healthy = false
            }
          }

          // If not last attempt, wait with exponential backoff
          if (attempt < this.config.retryAttempts) {
            const delay = Math.min(
              this.config.retryBaseDelay * Math.pow(2, attempt),
              this.config.retryMaxDelay
            )

            console.log(
              `⏳ Retry ${attempt + 1}/${this.config.retryAttempts} for ` +
              `${adapter.providerName} in ${delay}ms`
            )

            await this.sleep(delay)
          } else {
            console.error(
              `❌ ${operationName} failed for ${adapter.providerName} ` +
              `after ${attempt + 1} attempts`
            )
          }
        }
      }
    }

    // All providers failed
    throw new Error(
      `${operationName} failed for all providers. ` +
      `Last error: ${lastError?.message || 'Unknown error'}`
    )
  }

  /**
   * Execute quote request with failover
   */
  async getQuoteWithFailover(
    providers: PrintProviderAdapter[],
    request: QuoteRequest
  ): Promise<{ result: QuoteResult; decision: FailoverDecision }> {
    return await this.executeWithFailover(
      providers,
      async (adapter) => await adapter.getQuote(request),
      'Get quote'
    )
  }

  /**
   * Execute order creation with failover
   */
  async createOrderWithFailover(
    providers: PrintProviderAdapter[],
    request: CreateOrderRequest
  ): Promise<{ result: OrderResult; decision: FailoverDecision }> {
    return await this.executeWithFailover(
      providers,
      async (adapter) => await adapter.createOrder(request),
      'Create order'
    )
  }

  /**
   * Execute order status check with failover
   */
  async getOrderStatusWithFailover(
    providers: PrintProviderAdapter[],
    providerOrderId: string
  ): Promise<{ result: OrderStatusUpdate; decision: FailoverDecision }> {
    return await this.executeWithFailover(
      providers,
      async (adapter) => await adapter.getOrderStatus(providerOrderId),
      'Get order status'
    )
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Shutdown - stop all health checks
   */
  shutdown(): void {
    for (const providerId of this.healthCheckIntervals.keys()) {
      this.stopHealthCheck(providerId)
    }
    console.log('🛑 Failover service shutdown complete')
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let failoverServiceInstance: ProviderFailoverService | null = null

export function getFailoverService(config?: Partial<FailoverConfig>): ProviderFailoverService {
  if (!failoverServiceInstance) {
    failoverServiceInstance = new ProviderFailoverService(config)
  }
  return failoverServiceInstance
}

export function resetFailoverService(): void {
  if (failoverServiceInstance) {
    failoverServiceInstance.shutdown()
    failoverServiceInstance = null
  }
}
