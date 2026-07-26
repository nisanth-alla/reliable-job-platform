import { z } from "zod";

import { JOB_TYPES } from "./job.js";

export const reportGeneratePayloadSchema = z.object({
  reportName: z.string().min(1).max(200),
  durationMs: z.number().int().positive().max(600_000).optional(),
  shouldFail: z.boolean().optional(),
});

export type ReportGeneratePayload = z.infer<typeof reportGeneratePayloadSchema>;

const payloadSchemasByType = {
  "report.generate": reportGeneratePayloadSchema,
} as const;

export function jobPayloadSchema(type: (typeof JOB_TYPES)[number]) {
  return payloadSchemasByType[type];
}

export const createJobBodySchema = z.object({
  type: z.enum(JOB_TYPES),
  payload: z.unknown(),
  idempotencyKey: z.string().min(1).max(256).optional(),
});

export type CreateJobBody = z.infer<typeof createJobBodySchema>;

export const listJobsQuerySchema = z.object({
  status: z
    .enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CREATED", "RETRY"])
    .optional(),
  type: z.enum(JOB_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
