# System requirements

This document defines what the Reliable Job Processing Platform must do before implementation begins. It covers job lifecycle, functional requirements, failure and retry behavior, and the initial architecture.

## Goals

- Accept job submissions through an HTTP API and (later) a web dashboard.
- Persist job records and processing history durably in PostgreSQL.
- Process jobs asynchronously via workers backed by Redis and BullMQ.
- Support inspection, monitoring, manual retry, and idempotent submission.
- Keep the first job domain simple: simulated report generation.

## Job model

Each job represents a single unit of asynchronous work.

### Required fields (conceptual)

| Field | Description |
| --- | --- |
| `id` | Stable unique identifier (UUID). |
| `type` | Job kind; initial value: `report.generate`. |
| `status` | Current lifecycle state (see below). |
| `payload` | JSON input for the worker (report parameters for v1). |
| `idempotencyKey` | Optional client-supplied key to deduplicate submissions. |
| `attemptCount` | Number of processing attempts so far. |
| `maxAttempts` | Upper bound on automatic retries (configurable default). |
| `lastError` | Message or structured error from the most recent failure. |
| `createdAt`, `updatedAt` | Timestamps for auditing and UI sorting. |
| `queuedAt`, `startedAt`, `finishedAt` | Optional timestamps for each phase. |

### Job attempts

Each time a worker runs (or re-runs) a job, the system records a **job attempt**:

- attempt number
- started and finished timestamps
- outcome: `running`, `completed`, or `failed`
- error details when failed

Attempts are append-only history; they must not be deleted when a job is retried.

## Job lifecycle

### States

| State | Meaning |
| --- | --- |
| `CREATED` | Record exists in PostgreSQL; not yet published to the queue (transient). |
| `QUEUED` | Published to BullMQ; waiting for a worker. |
| `PROCESSING` | A worker has claimed the job and is executing. |
| `COMPLETED` | Work finished successfully; terminal. |
| `FAILED` | Work failed and will not run again unless manually retried; terminal until retry. |
| `RETRY` | User or system scheduled another run after failure; transitions back toward queue. |

For v1, the API and dashboard primarily expose: `QUEUED`, `PROCESSING`, `COMPLETED`, and `FAILED`. Internal transitions may use `CREATED` and `RETRY` briefly.

### Allowed transitions

```text
CREATED  -->  QUEUED
QUEUED   -->  PROCESSING
PROCESSING  -->  COMPLETED
PROCESSING  -->  FAILED
FAILED   -->  RETRY  (manual retry via API/UI)
FAILED   -->  QUEUED  (automatic retry after backoff, if attempts remain)
RETRY    -->  QUEUED
```

Rules:

- `COMPLETED` is terminal; no further processing unless a new job is submitted (new `id`).
- `FAILED` becomes terminal when `attemptCount >= maxAttempts` and no manual retry is requested.
- Manual retry is only allowed from `FAILED` (not from `COMPLETED` or active `PROCESSING`).
- Duplicate idempotency keys must not create a second job or second queue message.

### Lifecycle diagram

```text
CREATED
   |
   v
QUEUED
   |
   v
PROCESSING
   |
   +----> COMPLETED  (terminal)
   |
   +----> FAILED
             |
             +----> QUEUED  (automatic retry, if attempts left)
             |
             +----> RETRY --> QUEUED  (manual retry)
```

## Initial job type: `report.generate`

### Purpose

Simulate report generation without external dependencies so the platform can exercise queues, persistence, retries, and the dashboard.

### Payload (v1)

- `reportName` (string, required): display name for the report.
- `durationMs` (number, optional): simulated processing time; default from server config.
- `shouldFail` (boolean, optional): when true, worker fails after the wait (for testing failures and retries).

### Worker behavior

1. Transition job to `PROCESSING` and open a new attempt record.
2. Wait for `durationMs` (or default).
3. If `shouldFail` is true, mark attempt and job as failed with a clear error message.
4. Otherwise mark attempt and job as `COMPLETED`.
5. Persist all state changes to PostgreSQL before acknowledging the BullMQ message.

## Functional requirements

### FR-1 Job submission

- `POST /jobs` accepts `type`, `payload`, and optional `Idempotency-Key` header (or body field).
- Request body is validated with Zod; invalid requests return `400` with structured errors.
- On success, returns `201` with the job resource including `id` and `status`.
- Server creates a durable record, enqueues work, and returns without waiting for worker completion.

### FR-2 Idempotency

- When the same idempotency key is reused for the same job `type` and equivalent payload within a defined scope (e.g. same API client scope or global per deployment for v1), the API returns the **existing** job (`200` or `201` with same `id`) and does **not** enqueue a duplicate.
- Keys are stored durably; replay after worker failure must still not duplicate work at submission time.

### FR-3 Job retrieval

- `GET /jobs/:id` returns a single job with current status, payload, errors, attempt summary, and timestamps.
- Unknown id returns `404`.

### FR-4 Job listing

- `GET /jobs` supports pagination and filtering by `status` and optionally `type`.
- Default sort: newest first (`createdAt` desc).

### FR-5 Manual retry

- `POST /jobs/:id/retry` (or equivalent) re-queues a job in `FAILED` state when retries are permitted by policy.
- Returns updated job resource; invalid state returns `409` or `422` with explanation.

### FR-6 Dashboard (later milestone)

- Submit `report.generate` jobs through a form.
- List jobs with live or refresh-based status updates.
- Detail view shows attempts, errors, and timestamps.
- Retry button for failed jobs, calling the retry API.

## Failure and retry behavior

### Automatic retries (worker / queue)

- Transient failures (simulated or real) increment `attemptCount`.
- BullMQ retry policy uses exponential backoff with configurable base delay and max attempts aligned with `maxAttempts` on the job record.
- Each retry creates a new attempt row when processing starts again.
- When max attempts are exhausted, job status stays `FAILED`; queue must not keep retrying indefinitely.

### Failure recording

- On failure, persist `lastError`, attempt outcome, and `finishedAt`.
- Worker crashes mid-processing: job may remain `PROCESSING` until stale detection or BullMQ stalled-job handling (v1: document expectation; implement stall recovery in reliability milestone).

### Manual retry

- Allowed **only** when job status is `FAILED` (not from `QUEUED`, `PROCESSING`, `COMPLETED`, or `CREATED`).
- Manual retry may be used even when automatic attempts are exhausted (`attemptCount >= maxAttempts`).
- Re-enqueues a single new queue message; idempotency at submission does not apply to retry of an existing job id.

### Idempotency vs processing

- Idempotency prevents duplicate **submissions**.
- At-least-once delivery from the queue means workers must be safe to run more than once for the same job id where side effects exist; for `report.generate` simulation, repeated runs are acceptable but attempt history must reflect each run.

## Non-functional requirements (initial)

- **Durability**: Job and attempt records survive API and worker restarts.
- **Observability**: Structured logs for submit, enqueue, start, complete, fail, and retry events with `jobId` correlation.
- **Local development**: PostgreSQL and Redis runnable via Docker Compose; documented env vars.
- **Quality**: TypeScript throughout; ESLint and Prettier; tests added in milestone 7.

## Architecture (initial)

```text
Next.js dashboard
        |
        v
Express API  ----->  PostgreSQL  (jobs, attempts, idempotency keys)
        |
        v
     BullMQ / Redis
        |
        v
      Worker  ----->  PostgreSQL  (status updates, attempts)
```

### Component responsibilities

| Component | Responsibility |
| --- | --- |
| Express API | Validation, CRUD, idempotency, enqueue, retry endpoints |
| PostgreSQL | Source of truth for job state and history |
| Redis / BullMQ | Delivery, delays, worker concurrency, automatic retries |
| Worker | Execute `report.generate`, update DB, ack/fail messages |
| Next.js | Operator UI for submit, list, detail, retry |

### Out of scope for v1

- Multi-tenant auth and RBAC
- Multiple worker types beyond `report.generate`
- Scheduled/cron jobs
- Dead-letter admin UI beyond listing failed jobs
- Horizontal autoscaling documentation (may be noted for future)

## Acceptance criteria (Milestone 1)

- [ ] Lifecycle states and transitions are agreed and documented (this file).
- [ ] Functional requirements FR-1 through FR-6 are defined.
- [ ] Failure, automatic retry, and manual retry behavior are defined.
- [ ] Initial architecture and first job type are documented.
- [ ] README links to this document for lifecycle detail.

Implementation milestones 2–7 in the README build toward satisfying these requirements.
