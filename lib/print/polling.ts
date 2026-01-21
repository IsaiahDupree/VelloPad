/**
 * Print Provider Polling Service
 * Feature: BS-604
 *
 * Polls print providers for order status updates when webhooks are unavailable
 * Runs as a scheduled job (cron/background worker)
 */

import { createClient } from '@/lib/supabase/server';
import { ProdigiAdapter } from './adapters/prodigi';

interface PollingConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxAgeHours: number; // Don't poll orders older than this
  statuses: string[]; // Only poll orders in these statuses
}

const DEFAULT_CONFIG: PollingConfig = {
  enabled: true,
  intervalMinutes: 30,
  maxAgeHours: 72, // 3 days
  statuses: ['pending', 'processing', 'shipped'],
};

/**
 * Poll Prodigi for order status updates
 */
export async function pollProdigiOrders(config: Partial<PollingConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!cfg.enabled) {
    console.log('Polling disabled');
    return;
  }

  console.log('Starting Prodigi order status polling...');

  const supabase = await createClient();

  // Find orders that need polling
  const maxAge = new Date();
  maxAge.setHours(maxAge.getHours() - cfg.maxAgeHours);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('provider', 'prodigi')
    .in('status', cfg.statuses)
    .gte('created_at', maxAge.toISOString())
    .order('updated_at', { ascending: true })
    .limit(50); // Poll 50 orders per run

  if (error) {
    console.error('Error fetching orders for polling:', error);
    return;
  }

  if (!orders || orders.length === 0) {
    console.log('No orders to poll');
    return;
  }

  console.log(`Polling ${orders.length} orders...`);

  const adapter = new ProdigiAdapter({
    apiKey: process.env.PRODIGI_API_KEY!,
    environment: process.env.PRODIGI_ENV === 'production' ? 'live' : 'sandbox',
  });

  // Poll each order
  let updated = 0;
  let errors = 0;

  for (const order of orders) {
    if (!order.provider_order_id) {
      continue;
    }

    try {
      const status = await adapter.getOrderStatus(order.provider_order_id);

      // Check if status changed
      if (status.status !== order.status || status.trackingNumber !== order.tracking_number) {
        // Update order
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: status.status,
            tracking_number: status.trackingNumber || null,
            tracking_url: status.trackingUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`Error updating order ${order.id}:`, updateError);
          errors++;
          continue;
        }

        // Create status update record
        await supabase
          .from('order_status_updates')
          .insert({
            order_id: order.id,
            status: status.status,
            message: status.message || `Status updated via polling`,
            provider_data: status,
            created_at: new Date().toISOString(),
          });

        // Update shipment if tracking info available
        if (status.trackingNumber) {
          await supabase
            .from('shipments')
            .upsert({
              order_id: order.id,
              carrier_name: 'Unknown',
              tracking_number: status.trackingNumber,
              tracking_url: status.trackingUrl || null,
              shipped_at: null,
              delivered_at: null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'order_id',
            });
        }

        updated++;
        console.log(`Updated order ${order.id}: ${order.status} → ${status.status}`);
      }
    } catch (error) {
      console.error(`Error polling order ${order.id}:`, error);
      errors++;
    }
  }

  console.log(`Polling complete: ${updated} updated, ${errors} errors`);
}

/**
 * Poll Gelato for order status updates
 */
export async function pollGelatoOrders(config: Partial<PollingConfig> = {}): Promise<void> {
  // TODO: Implement when Gelato adapter is ready
  console.log('Gelato polling not yet implemented');
}

/**
 * Poll Lulu for order status updates
 */
export async function pollLuluOrders(config: Partial<PollingConfig> = {}): Promise<void> {
  // TODO: Implement when Lulu adapter is ready
  console.log('Lulu polling not yet implemented');
}

/**
 * Poll all providers
 */
export async function pollAllProviders(config: Partial<PollingConfig> = {}): Promise<void> {
  await Promise.allSettled([
    pollProdigiOrders(config),
    pollGelatoOrders(config),
    pollLuluOrders(config),
  ]);
}

/**
 * Schedule polling job
 * Call this from a cron job or background worker
 */
export async function schedulePolling(intervalMinutes: number = 30): Promise<void> {
  console.log(`Starting polling scheduler (interval: ${intervalMinutes} minutes)`);

  const run = async () => {
    try {
      await pollAllProviders();
    } catch (error) {
      console.error('Error in polling job:', error);
    }
  };

  // Run immediately
  await run();

  // Schedule periodic runs
  setInterval(run, intervalMinutes * 60 * 1000);
}

/**
 * Check if order needs polling (no recent webhook updates)
 */
export async function shouldPollOrder(orderId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('updated_at, status')
    .eq('id', orderId)
    .single();

  if (!order) {
    return false;
  }

  // Don't poll completed/cancelled orders
  if (['completed', 'cancelled', 'delivered', 'refunded'].includes(order.status)) {
    return false;
  }

  // Poll if no update in last 30 minutes
  const lastUpdate = new Date(order.updated_at);
  const now = new Date();
  const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

  return minutesSinceUpdate > 30;
}
