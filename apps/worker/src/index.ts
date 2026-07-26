import { JOB_TYPES } from "@reliable-job-platform/shared";

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 5);

console.log("Worker shell started", {
  supportedJobTypes: JOB_TYPES,
  concurrency,
});

process.on("SIGINT", () => {
  console.log("Worker shutting down");
  process.exit(0);
});
