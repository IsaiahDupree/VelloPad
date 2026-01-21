/**
 * Rendition Queue System
 * Feature: BS-401
 *
 * Manages PDF rendering jobs using BullMQ + Redis
 * Handles interior PDF, cover PDF, and preflight checks
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import { createClient } from '@/lib/supabase/server'
import IORedis from 'ioredis'

// ============================================================================
// TYPES
// ============================================================================

export type RenderJobType = 'interior' | 'cover' | 'preflight'

export interface RenditionJobData {
  renditionId: string
  bookId: string
  workspaceId: string
  userId: string
  jobType: RenderJobType
  versionSnapshotId?: string

  // Options
  options?: {
    dpi?: number
    colorSpace?: 'RGB' | 'CMYK'
    includeBleed?: boolean
    cropMarks?: boolean
  }
}

export interface RenditionJobResult {
  success: boolean
  pdfUrl?: string
  pageCount?: number
  fileSizeBytes?: number
  error?: {
    message: string
    code: string
    details?: any
  }
  warnings?: Array<{
    type: string
    message: string
    severity: 'low' | 'medium' | 'high'
  }>
}

// ============================================================================
// REDIS CONNECTION
// ============================================================================

let redisConnection: IORedis | null = null

function getRedisConnection(): IORedis {
  if (!redisConnection) {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL

    if (!redisUrl) {
      throw new Error('REDIS_URL or UPSTASH_REDIS_URL environment variable is required')
    }

    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    })
  }

  return redisConnection
}

// ============================================================================
// QUEUE SETUP
// ============================================================================

const QUEUE_NAME = 'rendition'

export function getRenditionQueue() {
  const connection = getRedisConnection()

  return new Queue(QUEUE_NAME, {
    connection: connection as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2s, doubles each retry
      },
      removeOnComplete: {
        age: 86400, // Keep completed jobs for 24 hours
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
      },
    },
  })
}

// ============================================================================
// ENQUEUE RENDITION REQUEST
// ============================================================================

export async function enqueueRenditionRequest(params: {
  bookId: string
  workspaceId: string
  userId: string
  versionSnapshotId?: string
  options?: RenditionJobData['options']
}): Promise<{ renditionId: string; jobIds: string[] }> {
  const supabase = await createClient()
  const queue = getRenditionQueue()

  // Create rendition record
  const { data: rendition, error: renditionError } = await supabase
    .from('renditions')
    .insert({
      book_id: params.bookId,
      workspace_id: params.workspaceId,
      version_snapshot_id: params.versionSnapshotId,
      status: 'pending',
      created_by: params.userId,
    })
    .select()
    .single()

  if (renditionError || !rendition) {
    throw new Error(`Failed to create rendition record: ${renditionError?.message}`)
  }

  const renditionId = rendition.id
  const jobIds: string[] = []

  try {
    // Enqueue interior PDF job
    const interiorJob = await queue.add(
      'render-interior',
      {
        renditionId,
        bookId: params.bookId,
        workspaceId: params.workspaceId,
        userId: params.userId,
        jobType: 'interior',
        versionSnapshotId: params.versionSnapshotId,
        options: params.options,
      },
      {
        priority: 1,
      }
    )

    // Track job in database
    await supabase.from('render_jobs').insert({
      rendition_id: renditionId,
      job_id: interiorJob.id,
      job_type: 'interior',
      status: 'waiting',
    })

    jobIds.push(interiorJob.id!)

    // Enqueue cover PDF job
    const coverJob = await queue.add(
      'render-cover',
      {
        renditionId,
        bookId: params.bookId,
        workspaceId: params.workspaceId,
        userId: params.userId,
        jobType: 'cover',
        versionSnapshotId: params.versionSnapshotId,
        options: params.options,
      },
      {
        priority: 1,
      }
    )

    await supabase.from('render_jobs').insert({
      rendition_id: renditionId,
      job_id: coverJob.id,
      job_type: 'cover',
      status: 'waiting',
    })

    jobIds.push(coverJob.id!)

    // Enqueue preflight checks (runs after PDFs are generated)
    const preflightJob = await queue.add(
      'preflight',
      {
        renditionId,
        bookId: params.bookId,
        workspaceId: params.workspaceId,
        userId: params.userId,
        jobType: 'preflight',
        versionSnapshotId: params.versionSnapshotId,
        options: params.options,
      },
      {
        priority: 0, // Lower priority, runs after render jobs
        delay: 5000, // Wait 5s for PDFs to be generated
      }
    )

    await supabase.from('render_jobs').insert({
      rendition_id: renditionId,
      job_id: preflightJob.id,
      job_type: 'preflight',
      status: 'waiting',
    })

    jobIds.push(preflightJob.id!)

    return { renditionId, jobIds }
  } catch (error) {
    // Cleanup rendition on failure
    await supabase.from('renditions').delete().eq('id', renditionId)
    throw error
  }
}

// ============================================================================
// GET RENDITION STATUS
// ============================================================================

export async function getRenditionStatus(renditionId: string) {
  const supabase = await createClient()

  const { data: rendition, error } = await supabase
    .from('renditions')
    .select(`
      *,
      render_jobs (
        id,
        job_id,
        job_type,
        status,
        progress,
        started_at,
        completed_at,
        error
      )
    `)
    .eq('id', renditionId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch rendition status: ${error.message}`)
  }

  return rendition
}

// ============================================================================
// CANCEL RENDITION
// ============================================================================

export async function cancelRendition(renditionId: string): Promise<void> {
  const supabase = await createClient()
  const queue = getRenditionQueue()

  // Get all jobs for this rendition
  const { data: jobs } = await supabase
    .from('render_jobs')
    .select('job_id')
    .eq('rendition_id', renditionId)

  if (jobs) {
    // Remove jobs from queue
    await Promise.all(
      jobs.map(async (job) => {
        try {
          const bullJob = await queue.getJob(job.job_id)
          if (bullJob) {
            await bullJob.remove()
          }
        } catch (error) {
          console.error(`Failed to remove job ${job.job_id}:`, error)
        }
      })
    )
  }

  // Update rendition status
  await supabase
    .from('renditions')
    .update({ status: 'cancelled' })
    .eq('id', renditionId)
}

// ============================================================================
// QUEUE METRICS
// ============================================================================

export async function getQueueMetrics() {
  const queue = getRenditionQueue()

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

export async function cleanupCompletedJobs(olderThanHours: number = 24): Promise<number> {
  const queue = getRenditionQueue()

  const jobs = await queue.getCompleted()
  const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000

  let cleaned = 0
  for (const job of jobs) {
    if (job.finishedOn && job.finishedOn < cutoffTime) {
      await job.remove()
      cleaned++
    }
  }

  return cleaned
}

export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit()
    redisConnection = null
  }
}
