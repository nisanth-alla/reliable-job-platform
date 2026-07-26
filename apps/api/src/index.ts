import express from "express";

import { JOB_STATUSES, JOB_TYPES } from "@reliable-job-platform/shared";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api" });
});

app.get("/meta", (_req, res) => {
  res.json({
    jobTypes: JOB_TYPES,
    jobStatuses: JOB_STATUSES,
  });
});

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});
