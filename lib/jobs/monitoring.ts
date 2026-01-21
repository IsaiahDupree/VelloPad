/**
 * Job Observability and Monitoring
 * Feature: BS-901
 *
 * Monitor BullMQ render jobs with:
 * - Job logs and status tracking
 * - Automatic retries with exponential backoff
 * - Alerting for failed jobs
 * - Performance metrics
 */

import { createClient } from '@/lib/supabase/server';
import { Queue, Job } from 'bullmq';

// ============================================================================
// JOB MONITORING TYPES
// ============================================================================

export interface JobLog {
  id: string;
  jobId: string;
  jobType: string;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'delayed' | 'waiting';
  progress: number;
  attempt: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
}

export interface JobStats {
  total: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  avgDuration: number;
  successRate: number;
}

export interface JobAlert {
  jobId: string;
  jobType: string;
  alertType: 'failure' | 'timeout' | 'retry_exhausted' | 'high_failure_rate';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  timestamp: Date;
}

// ============================================================================
// JOB LOG TRACKING
// ============================================================================

/**
 * Log job status to database
 */
export async function logJobStatus(
  jobId: string,
  status: JobLog['status'],
  metadata?: Partial<JobLog>
): Promise<void> {
  try {
    const supabase = await createClient();

    // Get existing job record
    const { data: existingJob } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (existingJob) {
      // Update existing job
      await supabase
        .from('render_jobs')
        .update({
          status,
          progress: metadata?.progress ?? existingJob.progress,
          attempt: metadata?.attempt ?? existingJob.attempt,
          error_message: metadata?.error,
          started_at: metadata?.startedAt?.toISOString() ?? existingJob.started_at,
          completed_at: metadata?.completedAt?.toISOString() ?? existingJob.completed_at,
          metadata: {
            ...existingJob.metadata,
            ...metadata?.metadata,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId);
    } else {
      console.warn(`Job ${jobId} not found in database`);
    }
  } catch (error) {
    console.error('Error logging job status:', error);
  }
}

/**
 * Get job logs for a specific job
 */
export async function getJobLogs(jobId: string): Promise<JobLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting job logs:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    jobId: row.job_id,
    jobType: row.job_type,
    status: row.status,
    progress: row.progress,
    attempt: row.attempt,
    error: row.error_message,
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    duration: row.completed_at && row.started_at
      ? new Date(row.completed_at).getTime() - new Date(row.started_at).getTime()
      : undefined,
    metadata: row.metadata,
  }));
}

/**
 * Get job logs for a rendition
 */
export async function getRenditionJobLogs(renditionId: string): Promise<JobLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('rendition_id', renditionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting rendition job logs:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    jobId: row.job_id,
    jobType: row.job_type,
    status: row.status,
    progress: row.progress,
    attempt: row.attempt,
    error: row.error_message,
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    duration: row.completed_at && row.started_at
      ? new Date(row.completed_at).getTime() - new Date(row.started_at).getTime()
      : undefined,
    metadata: row.metadata,
  }));
}

// ============================================================================
// JOB STATISTICS
// ============================================================================

/**
 * Get job statistics for a time period
 */
export async function getJobStats(hours: number = 24): Promise<JobStats> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const { data, error } = await supabase
    .from('render_jobs')
    .select('*')
    .gte('created_at', cutoffDate.toISOString());

  if (error) {
    console.error('Error getting job stats:', error);
    return {
      total: 0,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      avgDuration: 0,
      successRate: 0,
    };
  }

  const jobs = data || [];

  const total = jobs.length;
  const waiting = jobs.filter(j => j.status === 'waiting').length;
  const active = jobs.filter(j => j.status === 'active').length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed = jobs.filter(j => j.status === 'failed').length;
  const delayed = jobs.filter(j => j.status === 'delayed').length;

  // Calculate average duration for completed jobs
  const completedJobs = jobs.filter(j => j.status === 'completed' && j.started_at && j.completed_at);
  const durations = completedJobs.map(j =>
    new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()
  );
  const avgDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  // Calculate success rate
  const finishedJobs = completed + failed;
  const successRate = finishedJobs > 0 ? (completed / finishedJobs) * 100 : 0;

  return {
    total,
    waiting,
    active,
    completed,
    failed,
    delayed,
    avgDuration: Math.round(avgDuration),
    successRate: Math.round(successRate * 100) / 100,
  };
}

/**
 * Get job statistics for a specific book
 */
export async function getBookJobStats(bookId: string): Promise<JobStats> {
  const supabase = await createClient();

  const { data: renditions } = await supabase
    .from('renditions')
    .select('id')
    .eq('book_id', bookId);

  if (!renditions || renditions.length === 0) {
    return {
      total: 0,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      avgDuration: 0,
      successRate: 0,
    };
  }

  const renditionIds = renditions.map(r => r.id);

  const { data, error } = await supabase
    .from('render_jobs')
    .select('*')
    .in('rendition_id', renditionIds);

  if (error) {
    console.error('Error getting book job stats:', error);
    return {
      total: 0,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      avgDuration: 0,
      successRate: 0,
    };
  }

  const jobs = data || [];

  const total = jobs.length;
  const waiting = jobs.filter(j => j.status === 'waiting').length;
  const active = jobs.filter(j => j.status === 'active').length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed = jobs.filter(j => j.status === 'failed').length;
  const delayed = jobs.filter(j => j.status === 'delayed').length;

  const completedJobs = jobs.filter(j => j.status === 'completed' && j.started_at && j.completed_at);
  const durations = completedJobs.map(j =>
    new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()
  );
  const avgDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  const finishedJobs = completed + failed;
  const successRate = finishedJobs > 0 ? (completed / finishedJobs) * 100 : 0;

  return {
    total,
    waiting,
    active,
    completed,
    failed,
    delayed,
    avgDuration: Math.round(avgDuration),
    successRate: Math.round(successRate * 100) / 100,
  };
}

// ============================================================================
// ALERTING
// ============================================================================

/**
 * Create an alert for a failed job
 */
export async function createJobAlert(alert: JobAlert): Promise<void> {
  try {
    console.error(`[JOB ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`, alert);

    // In production, send alerts via:
    // - Email (urgent failures)
    // - Slack webhook
    // - PagerDuty (critical failures)
    // - Sentry (error tracking)

    // For now, just log to console
    if (alert.severity === 'critical') {
      // Could trigger immediate notification
      console.error('[CRITICAL ALERT] Job failure requires immediate attention:', alert);
    }
  } catch (error) {
    console.error('Error creating job alert:', error);
  }
}

/**
 * Monitor job and create alerts as needed
 */
export async function monitorJob(jobId: string, job: any): Promise<void> {
  try {
    if (job.failedReason) {
      // Job failed
      const severity = job.attemptsMade >= 3 ? 'critical' : 'high';

      await createJobAlert({
        jobId,
        jobType: job.name,
        alertType: job.attemptsMade >= 3 ? 'retry_exhausted' : 'failure',
        message: `Job ${jobId} (${job.name}) failed: ${job.failedReason}`,
        severity,
        metadata: {
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          data: job.data,
        },
        timestamp: new Date(),
      });
    }

    // Check for timeout (jobs taking too long)
    if (job.processedOn) {
      const duration = Date.now() - job.processedOn;
      const timeout = 10 * 60 * 1000; // 10 minutes

      if (duration > timeout) {
        await createJobAlert({
          jobId,
          jobType: job.name,
          alertType: 'timeout',
          message: `Job ${jobId} (${job.name}) exceeded timeout threshold`,
          severity: 'medium',
          metadata: {
            duration,
            timeout,
          },
          timestamp: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Error monitoring job:', error);
  }
}

/**
 * Check for high failure rate and create alert
 */
export async function checkFailureRate(): Promise<void> {
  const stats = await getJobStats(1); // Last hour

  if (stats.total > 10 && stats.successRate < 50) {
    await createJobAlert({
      jobId: 'system',
      jobType: 'all',
      alertType: 'high_failure_rate',
      message: `High job failure rate detected: ${stats.successRate}% success rate`,
      severity: 'critical',
      metadata: stats,
      timestamp: new Date(),
    });
  }
}

// ============================================================================
// JOB CLEANUP
// ============================================================================

/**
 * Clean up old completed jobs
 * Should be run as a cron job
 */
export async function cleanupOldJobs(daysToKeep: number = 30): Promise<{ deletedCount: number }> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const { error, count } = await supabase
    .from('render_jobs')
    .delete()
    .eq('status', 'completed')
    .lt('completed_at', cutoffDate.toISOString());

  if (error) {
    console.error('Error cleaning up old jobs:', error);
    return { deletedCount: 0 };
  }

  console.log(`Cleaned up ${count || 0} old job records`);
  return { deletedCount: count || 0 };
}

/**
 * Retry failed jobs
 */
export async function retryFailedJobs(queue: Queue, maxAge: number = 24): Promise<{ retriedCount: number }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAge);

    const failedJobs = await queue.getFailed();

    let retriedCount = 0;

    for (const job of failedJobs) {
      if (job.timestamp && job.timestamp > cutoffDate.getTime()) {
        await job.retry();
        retriedCount++;
      }
    }

    console.log(`Retried ${retriedCount} failed jobs`);
    return { retriedCount };
  } catch (error) {
    console.error('Error retrying failed jobs:', error);
    return { retriedCount: 0 };
  }
}
