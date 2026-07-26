# Reliable Job Processing Platform

A production-style background job processing system for submitting, processing, monitoring, and retrying asynchronous jobs.

The project is designed as a hands-on exploration of backend engineering, distributed systems, reliability, observability, and full-stack application design.

## Why this project exists

Many operations should not run inside a synchronous HTTP request.

Examples include:

- sending notifications
- generating reports
- processing uploaded files
- importing large datasets
- retrying failed integrations
- running scheduled background tasks

This project demonstrates how those operations can be accepted by an API, stored safely, processed asynchronously by workers, and monitored through a web dashboard.

## Core capabilities

The system will allow users to:

- submit a background job
- view queued, processing, completed, and failed jobs
- inspect job attempts and timestamps
- retry failed jobs
- prevent duplicate job submissions using idempotency keys
- observe worker activity and job failures
- review job-processing history

## Planned architecture

```text
Next.js dashboard
        |
        v
Express API
   |         |
   v         v
PostgreSQL  Redis / BullMQ
                 |
                 v
               Worker
```

### Responsibilities

**Next.js dashboard**

- submit jobs
- display job status
- show attempts and errors
- retry failed jobs

**Express API**

- validate requests
- create and retrieve jobs
- enforce idempotency
- publish jobs to the queue
- expose retry operations

**PostgreSQL**

- store durable job records
- store job attempts
- preserve job history and metadata

**Redis and BullMQ**

- queue jobs
- coordinate workers
- manage retries and delays
- track processing state

**Worker**

- process jobs outside the API request cycle
- update durable job state
- record failures and retry attempts

## Planned technology stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript
- Zod

### Data and messaging

- PostgreSQL
- Redis
- BullMQ

### Infrastructure and quality

- Docker
- Docker Compose
- ESLint
- Prettier
- Vitest
- structured logging

## Initial job type

The first implementation will use a simulated report-generation job.

A user submits a report request. The worker processes it asynchronously, waits for a controlled period, and then marks the job as completed or failed.

This keeps the initial domain simple so the project can focus on queue behavior, retries, idempotency, persistence, and observability.

## Job lifecycle

```text
CREATED
   |
   v
QUEUED
   |
   v
PROCESSING
   |
   +----> COMPLETED
   |
   +----> FAILED
             |
             v
           RETRY
```

The exact lifecycle and allowed transitions are documented in [docs/requirements.md](docs/requirements.md).

## Project milestones

### Milestone 1 — Requirements and architecture

- define job lifecycle
- define functional requirements
- define failure and retry behavior
- document initial architecture

### Milestone 2 — Project foundation

- create the monorepo structure
- configure TypeScript and shared tooling
- start PostgreSQL and Redis with Docker Compose
- add local environment configuration

### Milestone 3 — Job API

- create jobs
- retrieve jobs
- list jobs
- validate requests
- persist job records

### Milestone 4 — Queue and worker

- publish jobs using BullMQ
- process jobs asynchronously
- track status changes
- record attempts and failures

### Milestone 5 — Reliability

- add retry policies
- add idempotency keys
- prevent duplicate processing
- handle worker restarts safely

### Milestone 6 — Dashboard

- submit jobs through the UI
- display live job state
- inspect failures
- retry failed jobs

### Milestone 7 — Testing and observability

- add unit tests
- add integration tests
- add structured logs
- document operational behavior
