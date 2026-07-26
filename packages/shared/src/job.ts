export const JOB_STATUSES = [
  "CREATED",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "RETRY",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const TERMINAL_JOB_STATUSES = ["COMPLETED", "FAILED"] as const satisfies readonly JobStatus[];

export const JOB_TYPES = ["report.generate"] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const ATTEMPT_OUTCOMES = ["running", "completed", "failed"] as const;

export type AttemptOutcome = (typeof ATTEMPT_OUTCOMES)[number];
