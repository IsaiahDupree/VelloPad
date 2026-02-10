# Provider Failover System

**Feature:** PB-034
**Priority:** P1
**Status:** ✅ Implemented

## Overview

The Provider Failover System ensures high availability for print-on-demand operations by automatically detecting provider failures and failing over to backup providers. This system includes health checking, circuit breakers, retry logic with exponential backoff, and intelligent provider selection.

## Key Features

### 1. Health Monitoring
- Periodic health checks for all registered providers
- Response time tracking
- Automatic circuit breaker triggering on repeated failures
- Configurable health check intervals

### 2. Circuit Breaker Pattern
- Opens circuit after threshold failures (default: 3)
- Prevents cascading failures
- Automatic reset after timeout (default: 5 minutes)
- Per-provider circuit state tracking

### 3. Retry Logic
- Exponential backoff for transient failures
- Configurable retry attempts (default: 3)
- Maximum delay cap to prevent excessive waits
- Smart retry only on retriable errors

### 4. Automatic Failover
- Intelligent provider selection based on health
- Cascade through fallback chain
- Falls back to primary even if unhealthy when all providers fail
- Detailed decision logging for debugging

## Architecture

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ ProviderFailoverService │
│                         │
│ ┌─────────────────────┐ │
│ │  Health Monitor     │ │
│ │  - Periodic checks  │ │
│ │  - Response times   │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │  Circuit Breaker    │ │
│ │  - Failure tracking │ │
│ │  - State management │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │  Retry Engine       │ │
│ │  - Exponential back │ │
│ │  - Attempt tracking │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │  Failover Logic     │ │
│ │  - Provider select  │ │
│ │  - Cascade fallback │ │
│ └─────────────────────┘ │
└────────┬────────────────┘
         │
         ▼
┌────────┴────────┐
│   Providers     │
│ ┌─────────────┐ │
│ │  Primary    │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │  Secondary  │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │  Tertiary   │ │
│ └─────────────┘ │
└─────────────────┘
```

## Usage

### Basic Setup

```typescript
import { getFailoverService } from '@/lib/providers/failover'
import { ProdigiAdapter } from '@/lib/providers/prodigi/adapter'
import { GelatoAdapter } from '@/lib/providers/gelato/adapter'

// Get failover service instance
const failoverService = getFailoverService({
  healthCheckEnabled: true,
  healthCheckInterval: 60000, // 1 minute
  circuitBreakerThreshold: 3,
  circuitBreakerResetTimeout: 300000, // 5 minutes
  retryEnabled: true,
  retryAttempts: 3,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
})

// Register providers in priority order
const prodigi = new ProdigiAdapter(...)
const gelato = new GelatoAdapter(...)

failoverService.registerProvider(prodigi)
failoverService.registerProvider(gelato)
```

### Getting Quotes with Failover

```typescript
const quoteRequest: QuoteRequest = {
  spec: {
    productType: 'photo_book',
    trimSize: { width: 8, height: 8, unit: 'in' },
    pageCount: 50,
    binding: 'hardcover',
    paperType: 'premium',
    colorSpace: 'CMYK',
    interiorPdfUrl: 'https://...',
    coverPdfUrl: 'https://...',
  },
  quantity: 1,
  destinationCountry: 'US',
}

// Automatically retries and fails over to secondary provider if needed
const { result, decision } = await failoverService.getQuoteWithFailover(
  [prodigi, gelato],
  quoteRequest
)

console.log(`Quote from: ${result.providerName}`)
console.log(`Decision: ${decision.reason}`)
console.log(`Retries: ${decision.retriesAttempted}`)
```

### Creating Orders with Failover

```typescript
const orderRequest: CreateOrderRequest = {
  spec: { /* ... */ },
  quantity: 1,
  shippingAddress: { /* ... */ },
  bookId: 'book123',
  workspaceId: 'workspace123',
  userId: 'user123',
  renditionId: 'rendition123',
}

const { result, decision } = await failoverService.createOrderWithFailover(
  [prodigi, gelato],
  orderRequest
)

if (result.success) {
  console.log(`Order created with ${result.providerId}`)
  console.log(`Order ID: ${result.providerOrderId}`)
}
```

### Monitoring Provider Health

```typescript
// Get health status for specific provider
const health = failoverService.getProviderHealth('prodigi')
console.log(`Provider: ${health.providerName}`)
console.log(`Healthy: ${health.healthy}`)
console.log(`Circuit Open: ${health.circuitOpen}`)
console.log(`Failures: ${health.failureCount}`)
console.log(`Response Time: ${health.responseTime}ms`)

// Get all provider health statuses
const allHealth = failoverService.getAllProviderHealth()
allHealth.forEach(h => {
  console.log(`${h.providerName}: ${h.healthy ? '✅' : '❌'}`)
})

// Check if provider is available
const available = failoverService.isProviderAvailable('prodigi')
if (!available) {
  console.log('Provider unavailable - circuit breaker is open')
}
```

### Provider Selection

```typescript
// Manually select best available provider
const decision = failoverService.selectProvider(['prodigi', 'gelato', 'lulu'])

console.log(`Selected: ${decision.useProvider}`)
console.log(`Reason: ${decision.reason}`)
console.log(`Fallback chain: ${decision.fallbackChain.join(' → ')}`)
```

## Configuration Options

```typescript
interface FailoverConfig {
  // Health checking
  healthCheckEnabled: boolean          // Default: true
  healthCheckInterval: number          // Default: 60000 (1 minute)

  // Circuit breaker
  circuitBreakerThreshold: number      // Default: 3 failures
  circuitBreakerResetTimeout: number   // Default: 300000 (5 minutes)

  // Retry logic
  retryEnabled: boolean                // Default: true
  retryAttempts: number                // Default: 3
  retryBaseDelay: number               // Default: 1000ms (1 second)
  retryMaxDelay: number                // Default: 30000ms (30 seconds)

  // Failover
  failoverEnabled: boolean             // Default: true
}
```

## Failure Scenarios

### Scenario 1: Transient Failure
1. Primary provider fails (e.g., network timeout)
2. System retries with exponential backoff (1s → 2s → 4s)
3. Retry succeeds on attempt 2
4. Request completes with primary provider
5. Health status remains healthy

### Scenario 2: Provider Outage
1. Primary provider fails repeatedly
2. System retries 3 times, all fail
3. Circuit breaker opens after 3 failures
4. System fails over to secondary provider
5. Request succeeds with secondary provider
6. Primary provider marked unhealthy

### Scenario 3: Circuit Breaker Reset
1. Primary provider circuit is open (after failures)
2. 5 minutes pass (reset timeout)
3. Circuit breaker closes automatically
4. Next request tries primary provider again
5. If successful, provider marked healthy

### Scenario 4: All Providers Down
1. Primary provider fails, circuit opens
2. Secondary provider fails, circuit opens
3. Tertiary provider fails, circuit opens
4. System falls back to primary despite circuit breaker
5. Error returned to caller with detailed message

## Monitoring & Observability

### Health Check Events
```typescript
// Health checks log important events
✅ Health check passed for Prodigi (234ms)
❌ Health check failed for Gelato: Connection timeout
🔴 Circuit breaker opened for Prodigi (3 failures)
🟢 Circuit breaker reset for Prodigi
```

### Operation Events
```typescript
// Operations log decisions and retries
⏳ Retry 1/3 for Prodigi in 1000ms
⏳ Retry 2/3 for Prodigi in 2000ms
❌ Get quote failed for Prodigi after 3 attempts
✅ Get quote succeeded for Gelato on attempt 1
```

### Health Status API
```typescript
{
  providerId: 'prodigi',
  providerName: 'Prodigi',
  healthy: false,
  lastCheck: '2026-02-02T10:30:00Z',
  failureCount: 3,
  circuitOpen: true,
  circuitOpenUntil: '2026-02-02T10:35:00Z',
  lastError: 'Connection timeout',
  responseTime: undefined
}
```

## Best Practices

### 1. Provider Priority Order
Register providers in order of preference:
```typescript
failoverService.registerProvider(premium)    // Fastest, highest quality
failoverService.registerProvider(standard)   // Good balance
failoverService.registerProvider(economy)    // Fallback option
```

### 2. Circuit Breaker Tuning
Adjust thresholds based on provider reliability:
```typescript
// For unreliable provider - open circuit faster
{
  circuitBreakerThreshold: 2,
  circuitBreakerResetTimeout: 600000, // 10 minutes
}

// For reliable provider - be more forgiving
{
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeout: 180000, // 3 minutes
}
```

### 3. Health Check Frequency
Balance monitoring vs. API costs:
```typescript
// High-traffic app - check frequently
{ healthCheckInterval: 30000 } // 30 seconds

// Low-traffic app - check less often
{ healthCheckInterval: 300000 } // 5 minutes
```

### 4. Retry Configuration
Tune retries for your use case:
```typescript
// Critical operations - more retries
{
  retryAttempts: 5,
  retryBaseDelay: 500,
  retryMaxDelay: 10000,
}

// Non-critical operations - fewer retries
{
  retryAttempts: 2,
  retryBaseDelay: 2000,
  retryMaxDelay: 5000,
}
```

## Testing

Run E2E tests:
```bash
npx playwright test e2e/provider-failover.spec.ts
```

Key test scenarios:
- Provider registration and health tracking
- Retry logic with exponential backoff
- Automatic failover to secondary provider
- Circuit breaker opening after failures
- Circuit breaker automatic reset
- Health recovery after successful operations
- Cascading through multiple providers

## Performance Considerations

### Memory Usage
- Health status stored per provider (~200 bytes each)
- Health check intervals create timers (minimal overhead)
- Recommended: Monitor up to 10 providers

### Latency Impact
- Health checks: Async, non-blocking
- Retries: Add latency (1s base + exponential backoff)
- Failover: Adds one attempt per fallback provider
- Typical overhead: 0-5 seconds depending on failures

### Throughput
- No impact on successful requests
- Parallel health checks don't block operations
- Circuit breaker reduces load on unhealthy providers

## Troubleshooting

### Circuit Breaker Won't Reset
**Problem:** Circuit stays open past timeout
**Solution:** Check if `circuitOpenUntil` is in the future. Call `getProviderHealth()` to trigger reset check.

### All Providers Failing
**Problem:** All providers marked unhealthy
**Solution:** Check network connectivity, API keys, and provider status pages. Review error logs for specific failure reasons.

### Excessive Retries
**Problem:** Too many retry attempts slowing requests
**Solution:** Reduce `retryAttempts` or increase `retryBaseDelay` to fail faster.

### Health Checks Failing
**Problem:** Health checks fail but manual API calls work
**Solution:** Verify API credentials in health check config. Check rate limiting.

## Future Enhancements

- [ ] Weighted provider selection (prefer faster/cheaper providers)
- [ ] Provider cost optimization (choose cheapest available)
- [ ] Geographic routing (prefer providers closer to destination)
- [ ] Adaptive circuit breaker thresholds based on historical data
- [ ] Prometheus metrics integration
- [ ] Webhook notifications for provider health changes
- [ ] Dashboard UI for monitoring provider health

## References

- Martin Fowler: [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- AWS: [Implementing Retry Logic](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry.html)
- Google SRE: [Handling Cascading Failures](https://sre.google/sre-book/handling-cascading-failures/)
