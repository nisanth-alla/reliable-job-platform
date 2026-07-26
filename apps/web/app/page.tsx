import { JOB_STATUSES, JOB_TYPES } from "@reliable-job-platform/shared";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-zinc-400">Milestone 2</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Reliable Job Processing Platform
        </h1>
        <p className="text-zinc-400">
          Dashboard shell — job submission and monitoring UI will land in Milestone 6.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-3 text-lg font-medium">Shared contracts</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-2 text-zinc-400">Job types</p>
            <ul className="list-inside list-disc text-zinc-200">
              {JOB_TYPES.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-zinc-400">Job statuses</p>
            <ul className="list-inside list-disc text-zinc-200">
              {JOB_STATUSES.map((status) => (
                <li key={status}>{status}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
