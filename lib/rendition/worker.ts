/**
 * Rendition Worker
 * Feature: BS-401
 *
 * Background worker that processes PDF rendering jobs
 * Handles interior, cover, and preflight jobs
 */

import { Worker, Job } from 'bullmq'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import IORedis from 'ioredis'
import type { RenditionJobData, RenditionJobResult } from './queue'

// Import renderers (to be implemented)
import { renderInteriorPDF } from './renderers/interior'
import { renderCoverPDF } from './renderers/cover'
import { runPreflightChecks } from './preflight'

// ============================================================================
// REDIS CONNECTION
// ============================================================================

function getRedisConnection(): IORedis {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL

  if (!redisUrl) {
    throw new Error('REDIS_URL or UPSTASH_REDIS_URL environment variable is required')
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}

// ============================================================================
// SUPABASE CLIENT (Service Role)
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// ============================================================================
// JOB PROCESSOR
// ============================================================================

async function processRenditionJob(
  job: Job<RenditionJobData, RenditionJobResult>
): Promise<RenditionJobResult> {
  const { renditionId, jobType, bookId, workspaceId, options } = job.data
  const supabase = getSupabaseClient()

  // Update job status to active
  await supabase
    .from('render_jobs')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('job_id', job.id)

  // Update rendition status
  await supabase
    .from('renditions')
    .update({ status: 'processing' })
    .eq('id', renditionId)

  try {
    let result: RenditionJobResult

    // Route to appropriate handler
    switch (jobType) {
      case 'interior':
        await job.updateProgress(10)
        result = await renderInteriorPDF({
          bookId,
          workspaceId,
          renditionId,
          options,
          onProgress: (progress) => job.updateProgress(progress),
        })
        break

      case 'cover':
        await job.updateProgress(10)
        result = await renderCoverPDF({
          bookId,
          workspaceId,
          renditionId,
          options,
          onProgress: (progress) => job.updateProgress(progress),
        })
        break

      case 'preflight':
        await job.updateProgress(10)
        result = await runPreflightChecks({
          renditionId,
          bookId,
          workspaceId,
          onProgress: (progress) => job.updateProgress(progress),
        })
        break

      default:
        throw new Error(`Unknown job type: ${jobType}`)
    }

    // Update database on success
    await supabase
      .from('render_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress: 100,
        result,
      })
      .eq('job_id', job.id)

    // Update rendition with PDF URL
    if (jobType === 'interior' && result.pdfUrl) {
      await supabase
        .from('renditions')
        .update({
          interior_pdf_url: result.pdfUrl,
          page_count: result.pageCount,
        })
        .eq('id', renditionId)
    } else if (jobType === 'cover' && result.pdfUrl) {
      await supabase
        .from('renditions')
        .update({
          cover_pdf_url: result.pdfUrl,
        })
        .eq('id', renditionId)
    } else if (jobType === 'preflight') {
      await supabase
        .from('renditions')
        .update({
          preflight_passed: result.success,
          preflight_warnings: result.warnings || [],
          preflight_errors: result.error ? [result.error] : [],
          status: result.success ? 'completed' : 'failed',
        })
        .eq('id', renditionId)
    }

    return result
  } catch (error: any) {
    // Update job as failed
    await supabase
      .from('render_jobs')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
        },
      })
      .eq('job_id', job.id)

    // Update rendition status
    await supabase
      .from('renditions')
      .update({
        status: 'failed',
        error_message: error.message,
        error_details: {
          jobType,
          error: error.message,
          stack: error.stack,
        },
      })
      .eq('id', renditionId)

    throw error
  }
}

// ============================================================================
// WORKER SETUP
// ============================================================================

export function createRenditionWorker() {
  const connection = getRedisConnection()

  const worker = new Worker<RenditionJobData, RenditionJobResult>(
    'rendition',
    processRenditionJob,
    {
      connection: connection as any,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000, // Per second
      },
    }
  )

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} (${job.data.jobType}) completed successfully`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} (${job?.data.jobType}) failed:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('Worker error:', err)
  })

  return worker
}

// ============================================================================
// WORKER LIFECYCLE
// ============================================================================

let worker: Worker | null = null

export async function startWorker(): Promise<Worker> {
  if (worker) {
    console.warn('Worker already running')
    return worker
  }

  console.log('Starting rendition worker...')
  worker = createRenditionWorker()
  console.log('✅ Rendition worker started')
  return worker
}

export async function stopWorker(): Promise<void> {
  if (!worker) {
    return
  }

  console.log('Stopping rendition worker...')
  await worker.close()
  worker = null
  console.log('✅ Rendition worker stopped')
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down worker...')
  await stopWorker()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down worker...')
  await stopWorker()
  process.exit(0)
})
