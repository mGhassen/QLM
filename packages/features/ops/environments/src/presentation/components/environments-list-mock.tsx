import { cn } from "@qlm/ui/utils";

/** Project environments list mock (shared with project settings story shell). */
export function EnvironmentsListMock({ hideHeading = false }: { hideHeading?: boolean }) {
  return (
    <div>
      {!hideHeading ? (
        <h2 className="mb-6 text-2xl font-bold text-foreground">Environments</h2>
      ) : null}
      <div className="max-w-2xl space-y-3">
        {[
          { name: "production", status: "active" as const, services: 4 },
          { name: "staging", status: "active" as const, services: 4 },
          { name: "development", status: "inactive" as const, services: 2 },
        ].map((env) => (
          <div
            key={env.name}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  env.status === "active" ? "bg-green-500" : "bg-gray-500",
                )}
              />
              <span className="font-medium capitalize text-foreground">{env.name}</span>
              <span className="text-xs text-muted-foreground">
                {env.services} services
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
              >
                Configure
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-1 text-xs text-destructive transition-colors hover:bg-accent"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
        >
          + Add Environment
        </button>
      </div>
    </div>
  );
}
