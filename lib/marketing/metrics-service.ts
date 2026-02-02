// Marketing Metrics Service
// Aggregates metrics from events, orders, and campaigns for dashboard

import { createClient } from '@/lib/supabase/server';
import type { MetricsSnapshot, DashboardMetrics, TrendData, PeriodType } from './types';

/**
 * Compute metrics for a specific date
 */
export async function computeDailyMetrics(
  workspaceId: string,
  date: Date
): Promise<Omit<MetricsSnapshot, 'id' | 'created_at'>> {
  const supabase = await createClient();

  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch events for the day
  const { data: events } = await supabase
    .from('event')
    .select('event_type, properties')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString());

  // Fetch orders for the day
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount, status')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString());

  // Fetch email events for the day
  const { data: emailEvents } = await supabase
    .from('email_event')
    .select('event_type')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString());

  // Aggregate metrics from events
  const eventCounts: Record<string, number> = {};
  events?.forEach((event) => {
    eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
  });

  const new_signups = eventCounts['signup_complete'] || 0;
  const activated_users = eventCounts['activation_complete'] || 0;
  const books_created = eventCounts['book_created'] || 0;
  const pdfs_generated = eventCounts['pdf_generated'] || 0;

  // Aggregate order metrics
  const orders_placed = orders?.length || 0;
  const revenue_cents = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

  // Aggregate email metrics
  const emails_sent = emailEvents?.filter((e) => e.event_type === 'email.sent').length || 0;
  const emails_opened = emailEvents?.filter((e) => e.event_type === 'email.opened').length || 0;
  const emails_clicked = emailEvents?.filter((e) => e.event_type === 'email.clicked').length || 0;

  // Count active users (users with any event that day)
  const { count: active_users } = await supabase
    .from('event')
    .select('person_id', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString());

  // Extract UTM sources from events
  const utmSources: Record<string, number> = {};
  events?.forEach((event) => {
    const source = event.properties?.utm_source;
    if (source) {
      utmSources[source] = (utmSources[source] || 0) + 1;
    }
  });

  // Calculate conversion rates
  let signup_to_activation_rate: number | null = null;
  if (new_signups > 0) {
    signup_to_activation_rate = (activated_users / new_signups) * 100;
  }

  let activation_to_order_rate: number | null = null;
  if (activated_users > 0) {
    activation_to_order_rate = (orders_placed / activated_users) * 100;
  }

  return {
    snapshot_date: dateStr,
    period_type: 'daily' as PeriodType,
    workspace_id: workspaceId,
    new_signups,
    activated_users,
    books_created,
    pdfs_generated,
    orders_placed,
    revenue_cents,
    mrr_cents: 0, // MRR requires subscription data
    active_users: active_users || 0,
    avg_session_duration_seconds: 0, // Would require session tracking
    emails_sent,
    emails_opened,
    emails_clicked,
    visitor_to_signup_rate: null, // Would require pageview tracking
    signup_to_activation_rate,
    activation_to_order_rate,
    utm_sources: utmSources,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Compute metrics for a week (Monday-Sunday)
 */
export async function computeWeeklyMetrics(
  workspaceId: string,
  weekStart: Date
): Promise<Omit<MetricsSnapshot, 'id' | 'created_at'>> {
  const supabase = await createClient();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days to get Sunday

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Fetch all daily snapshots for the week
  const { data: dailySnapshots } = await supabase
    .from('marketing_metrics_snapshot')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('period_type', 'daily')
    .gte('snapshot_date', weekStartStr)
    .lte('snapshot_date', weekEndStr);

  if (!dailySnapshots || dailySnapshots.length === 0) {
    // No daily data, compute from scratch
    const startOfWeek = new Date(weekStart);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(weekEnd);
    endOfWeek.setHours(23, 59, 59, 999);

    const { data: events } = await supabase
      .from('event')
      .select('event_type, properties')
      .gte('created_at', startOfWeek.toISOString())
      .lte('created_at', endOfWeek.toISOString());

    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', startOfWeek.toISOString())
      .lte('created_at', endOfWeek.toISOString());

    const { data: emailEvents } = await supabase
      .from('email_event')
      .select('event_type')
      .gte('created_at', startOfWeek.toISOString())
      .lte('created_at', endOfWeek.toISOString());

    const eventCounts: Record<string, number> = {};
    events?.forEach((event) => {
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
    });

    const utmSources: Record<string, number> = {};
    events?.forEach((event) => {
      const source = event.properties?.utm_source;
      if (source) {
        utmSources[source] = (utmSources[source] || 0) + 1;
      }
    });

    const new_signups = eventCounts['signup_complete'] || 0;
    const activated_users = eventCounts['activation_complete'] || 0;

    return {
      snapshot_date: weekStartStr,
      period_type: 'weekly' as PeriodType,
      workspace_id: workspaceId,
      new_signups,
      activated_users,
      books_created: eventCounts['book_created'] || 0,
      pdfs_generated: eventCounts['pdf_generated'] || 0,
      orders_placed: orders?.length || 0,
      revenue_cents: orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
      mrr_cents: 0,
      active_users: 0,
      avg_session_duration_seconds: 0,
      emails_sent: emailEvents?.filter((e) => e.event_type === 'email.sent').length || 0,
      emails_opened: emailEvents?.filter((e) => e.event_type === 'email.opened').length || 0,
      emails_clicked: emailEvents?.filter((e) => e.event_type === 'email.clicked').length || 0,
      visitor_to_signup_rate: null,
      signup_to_activation_rate: new_signups > 0 ? (activated_users / new_signups) * 100 : null,
      activation_to_order_rate:
        activated_users > 0 ? ((orders?.length || 0) / activated_users) * 100 : null,
      utm_sources: utmSources,
      computed_at: new Date().toISOString(),
    };
  }

  // Aggregate from daily snapshots
  const aggregated = dailySnapshots.reduce(
    (acc, snapshot) => ({
      new_signups: acc.new_signups + snapshot.new_signups,
      activated_users: acc.activated_users + snapshot.activated_users,
      books_created: acc.books_created + snapshot.books_created,
      pdfs_generated: acc.pdfs_generated + snapshot.pdfs_generated,
      orders_placed: acc.orders_placed + snapshot.orders_placed,
      revenue_cents: acc.revenue_cents + snapshot.revenue_cents,
      emails_sent: acc.emails_sent + snapshot.emails_sent,
      emails_opened: acc.emails_opened + snapshot.emails_opened,
      emails_clicked: acc.emails_clicked + snapshot.emails_clicked,
      active_users: acc.active_users + snapshot.active_users,
    }),
    {
      new_signups: 0,
      activated_users: 0,
      books_created: 0,
      pdfs_generated: 0,
      orders_placed: 0,
      revenue_cents: 0,
      emails_sent: 0,
      emails_opened: 0,
      emails_clicked: 0,
      active_users: 0,
    }
  );

  // Merge UTM sources
  const utmSources: Record<string, number> = {};
  dailySnapshots.forEach((snapshot) => {
    Object.entries(snapshot.utm_sources || {}).forEach(([source, count]) => {
      utmSources[source] = (utmSources[source] || 0) + (count as number);
    });
  });

  return {
    snapshot_date: weekStartStr,
    period_type: 'weekly' as PeriodType,
    workspace_id: workspaceId,
    ...aggregated,
    mrr_cents: 0,
    avg_session_duration_seconds: 0,
    visitor_to_signup_rate: null,
    signup_to_activation_rate:
      aggregated.new_signups > 0
        ? (aggregated.activated_users / aggregated.new_signups) * 100
        : null,
    activation_to_order_rate:
      aggregated.activated_users > 0
        ? (aggregated.orders_placed / aggregated.activated_users) * 100
        : null,
    utm_sources: utmSources,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Save a metrics snapshot to the database
 */
export async function saveMetricsSnapshot(
  metrics: Omit<MetricsSnapshot, 'id' | 'created_at'>
): Promise<MetricsSnapshot> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_metrics_snapshot')
    .upsert(
      {
        snapshot_date: metrics.snapshot_date,
        period_type: metrics.period_type,
        workspace_id: metrics.workspace_id,
        new_signups: metrics.new_signups,
        activated_users: metrics.activated_users,
        books_created: metrics.books_created,
        pdfs_generated: metrics.pdfs_generated,
        orders_placed: metrics.orders_placed,
        revenue_cents: metrics.revenue_cents,
        mrr_cents: metrics.mrr_cents,
        active_users: metrics.active_users,
        avg_session_duration_seconds: metrics.avg_session_duration_seconds,
        emails_sent: metrics.emails_sent,
        emails_opened: metrics.emails_opened,
        emails_clicked: metrics.emails_clicked,
        visitor_to_signup_rate: metrics.visitor_to_signup_rate,
        signup_to_activation_rate: metrics.signup_to_activation_rate,
        activation_to_order_rate: metrics.activation_to_order_rate,
        utm_sources: metrics.utm_sources,
        computed_at: metrics.computed_at,
      },
      {
        onConflict: 'workspace_id,snapshot_date,period_type',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to save metrics snapshot:', error);
    throw new Error(`Failed to save metrics: ${error.message}`);
  }

  return data;
}

/**
 * Get metrics snapshot for a specific date
 */
export async function getMetricsSnapshot(
  workspaceId: string,
  date: string,
  periodType: PeriodType = 'daily'
): Promise<MetricsSnapshot | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketing_metrics_snapshot')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('snapshot_date', date)
    .eq('period_type', periodType)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Failed to get metrics snapshot:', error);
    throw new Error(`Failed to get metrics: ${error.message}`);
  }

  return data;
}

/**
 * Get dashboard metrics (today, yesterday, this week, last week + trends)
 */
export async function getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Get Monday of this week
  const thisWeekStart = new Date(today);
  const dayOfWeek = today.getDay() || 7; // Sunday = 0, make it 7
  thisWeekStart.setDate(today.getDate() - (dayOfWeek - 1));
  const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];

  // Get Monday of last week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];

  // Fetch snapshots
  const [todayMetrics, yesterdayMetrics, thisWeekMetrics, lastWeekMetrics] = await Promise.all([
    getMetricsSnapshot(workspaceId, todayStr, 'daily'),
    getMetricsSnapshot(workspaceId, yesterdayStr, 'daily'),
    getMetricsSnapshot(workspaceId, thisWeekStartStr, 'weekly'),
    getMetricsSnapshot(workspaceId, lastWeekStartStr, 'weekly'),
  ]);

  // Get trend data for last 30 days
  const trends = await getTrendData(workspaceId, 30);

  return {
    today: todayMetrics,
    yesterday: yesterdayMetrics,
    thisWeek: thisWeekMetrics,
    lastWeek: lastWeekMetrics,
    trends,
  };
}

/**
 * Get trend data for a specific metric over N days
 */
export async function getTrendData(
  workspaceId: string,
  days: number
): Promise<{
  signups: TrendData;
  activations: TrendData;
  revenue: TrendData;
}> {
  const supabase = await createClient();

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const { data: snapshots } = await supabase
    .from('marketing_metrics_snapshot')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('period_type', 'daily')
    .gte('snapshot_date', startDate.toISOString().split('T')[0])
    .lte('snapshot_date', endDate.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });

  if (!snapshots || snapshots.length === 0) {
    return {
      signups: { dates: [], values: [], change_percent: 0 },
      activations: { dates: [], values: [], change_percent: 0 },
      revenue: { dates: [], values: [], change_percent: 0 },
    };
  }

  const dates = snapshots.map((s) => s.snapshot_date);
  const signupValues = snapshots.map((s) => s.new_signups);
  const activationValues = snapshots.map((s) => s.activated_users);
  const revenueValues = snapshots.map((s) => s.revenue_cents / 100); // Convert to dollars

  // Calculate change percent (comparing first half to second half)
  const midpoint = Math.floor(snapshots.length / 2);
  const firstHalf = snapshots.slice(0, midpoint);
  const secondHalf = snapshots.slice(midpoint);

  const calcChange = (metric: 'new_signups' | 'activated_users' | 'revenue_cents') => {
    const firstSum = firstHalf.reduce((sum, s) => sum + (s[metric] || 0), 0);
    const secondSum = secondHalf.reduce((sum, s) => sum + (s[metric] || 0), 0);
    if (firstSum === 0) return 0;
    return ((secondSum - firstSum) / firstSum) * 100;
  };

  return {
    signups: {
      dates,
      values: signupValues,
      change_percent: Math.round(calcChange('new_signups') * 100) / 100,
    },
    activations: {
      dates,
      values: activationValues,
      change_percent: Math.round(calcChange('activated_users') * 100) / 100,
    },
    revenue: {
      dates,
      values: revenueValues,
      change_percent: Math.round(calcChange('revenue_cents') * 100) / 100,
    },
  };
}
