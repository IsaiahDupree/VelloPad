/**
 * Queue infrastructure stub for VelloPad
 * 
 * Production implementation would use BullMQ + Redis
 * This stub provides the interface for:
 * - PDF rendering jobs
 * - Print order submissions
 * - Email sending
 * - Webhook retries
 */

export interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface QueueConfig {
  name: string;
  maxConcurrency?: number;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: "exponential" | "fixed";
      delay: number;
    };
  };
}

// Job types for VelloPad
export interface RenderPdfJobData {
  bookId: string;
  userId: string;
  version: number;
  outputFormat: "print" | "digital";
}

export interface SubmitPrintOrderJobData {
  orderId: string;
  providerId: string;
  bookId: string;
  quantity: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface SendEmailJobData {
  to: string;
  templateId: string;
  variables: Record<string, string>;
}

// Queue factory stub
export function createQueue<T>(config: QueueConfig) {
  console.log(`[Queue] Creating queue: ${config.name}`);

  return {
    add: async (name: string, data: T, options?: { delay?: number; priority?: number }) => {
      const job: Job<T> = {
        id: `job_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name,
        data,
        status: "pending",
        attempts: 0,
        maxAttempts: config.defaultJobOptions?.attempts || 3,
        createdAt: new Date(),
      };
      console.log(`[Queue:${config.name}] Added job:`, job.id, name);
      return job;
    },

    process: async (handler: (job: Job<T>) => Promise<void>) => {
      console.log(`[Queue:${config.name}] Processor registered`);
      // In production, this would connect to Redis and process jobs
    },

    getJob: async (jobId: string): Promise<Job<T> | null> => {
      console.log(`[Queue:${config.name}] Getting job:`, jobId);
      return null;
    },

    getJobs: async (status: Job["status"][]): Promise<Job<T>[]> => {
      console.log(`[Queue:${config.name}] Getting jobs with status:`, status);
      return [];
    },
  };
}

// Pre-configured queues
export const pdfRenderQueue = createQueue<RenderPdfJobData>({
  name: "pdf-render",
  maxConcurrency: 2,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export const printOrderQueue = createQueue<SubmitPrintOrderJobData>({
  name: "print-orders",
  maxConcurrency: 5,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 10000 },
  },
});

export const emailQueue = createQueue<SendEmailJobData>({
  name: "emails",
  maxConcurrency: 10,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "fixed", delay: 1000 },
  },
});
