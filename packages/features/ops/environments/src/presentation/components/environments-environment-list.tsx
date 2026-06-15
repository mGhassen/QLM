import { useCallback, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@guepard/ui/utils";

import type { Service, ServiceType } from "./service-card";

export type DeploymentListSelection =
  | { kind: "environment"; key: string }
  | { kind: "service"; service: Service }
  | { kind: "clone"; service: Service; cloneIndex: number };

export type DeploymentListGroupBy = "none" | "environment" | "type" | "category";

/** Normalized deployment environment key (matches workspace `environments` slugs when names align). */
export function serviceDeploymentEnvironmentKey(service: Service): string {
  const n = service.environmentName?.trim();
  if (!n) return "unassigned";
  return n.toLowerCase().replace(/\s+/g, "-");
}

export function filterServicesByDeploymentEnvironment(
  services: Service[],
  activeKey: string,
): Service[] {
  return services.filter((s) => serviceDeploymentEnvironmentKey(s) === activeKey);
}

function isDataCategory(type: ServiceType): boolean {
  return (
    type === "external_datasource" ||
    type === "postgres" ||
    type === "redis" ||
    type === "mongo" ||
    type === "mysql"
  );
}

function formatEnvLabel(key: string) {
  if (key === "unassigned") return "Unassigned";
  return key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const TYPE_LABELS: Partial<Record<ServiceType, string>> = {
  postgres: "PostgreSQL",
  redis: "Redis",
  mongo: "MongoDB",
  mysql: "MySQL",
  external_datasource: "External data",
  web: "Web",
  worker: "Worker",
  cron: "Cron",
  bucket: "Bucket",
};

function typeGroupLabel(t: ServiceType) {
  return TYPE_LABELS[t] ?? t;
}

function statusTone(status: Service["status"]): {
  border: string;
  text: string;
  dot: string;
  bg: string;
} {
  if (status === "online")
    return {
      border: "border-green-500",
      text: "text-green-500",
      dot: "bg-green-500",
      bg: "bg-green-500/15",
    };
  if (status === "deploying")
    return {
      border: "border-amber-500",
      text: "text-amber-500",
      dot: "bg-amber-500",
      bg: "bg-amber-500/15",
    };
  if (status === "error")
    return {
      border: "border-red-500",
      text: "text-red-500",
      dot: "bg-red-500",
      bg: "bg-red-500/15",
    };
  return {
    border: "border-muted-foreground",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    bg: "bg-env-hover",
  };
}

function statusLabel(status: Service["status"]): string {
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  if (status === "deploying") return "Deploying";
  if (status === "error") return "Error";
  return status;
}

function TypeGlyph({ type }: { type: ServiceType }) {
  const g: Partial<Record<ServiceType, string>> = {
    postgres: "🐘",
    redis: "⚡",
    mongo: "🍃",
    mysql: "🐬",
    external_datasource: "🔗",
    web: "🌐",
    worker: "⚙",
    cron: "⏱",
    bucket: "📦",
  };
  return (
    <span className="text-2xl leading-none" aria-hidden>
      {g[type] ?? "■"}
    </span>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const v = value.trim() || "—";
  return (
    <div className="grid grid-cols-[minmax(5.5rem,7rem)_1fr] items-baseline gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[8rem_1fr]">
      <span className="font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-foreground",
          mono ? "min-w-0 break-all font-mono text-[11px]" : "min-w-0 break-words",
        )}
      >
        {v}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: Service["status"] }) {
  const t = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        t.border,
        t.text,
        t.bg,
      )}
    >
      <span className={cn("size-1.5 rounded-full", t.dot)} aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

const MOCK_CLONE_BRANCHES = [
  "feat/checkout-auth",
  "preview/app-v2",
  "hotfix/cve-rollup",
  "staging-shadow",
  "branch/experiment-ml",
];

function cloneRowLabel(_service: Service, cloneIndex: number) {
  if (cloneIndex === 0) return "Primary (writer)";
  const branch = MOCK_CLONE_BRANCHES[(cloneIndex - 1) % MOCK_CLONE_BRANCHES.length];
  return `Clone · ${branch}`;
}

function orderedEnvironmentKeys(
  services: Service[],
  environmentOrder: string[],
): string[] {
  const present = new Set(services.map(serviceDeploymentEnvironmentKey));
  const ordered: string[] = [];
  for (const slug of environmentOrder) {
    const key = slug.toLowerCase();
    if (!ordered.includes(key)) ordered.push(key);
  }
  for (const k of [...present].sort()) {
    if (!ordered.includes(k)) ordered.push(k);
  }
  return ordered;
}

type ListGroup = { key: string; label: string; services: Service[] };

function buildGroups(
  services: Service[],
  groupBy: DeploymentListGroupBy,
  environmentOrder: string[],
): ListGroup[] {
  const sorted = [...services].sort((a, b) => a.name.localeCompare(b.name));

  if (groupBy === "none") {
    return [{ key: "__flat__", label: "", services: sorted }];
  }

  if (groupBy === "environment") {
    const keys = orderedEnvironmentKeys(services, environmentOrder);
    return keys.map((key) => ({
      key,
      label: formatEnvLabel(key),
      services: sorted.filter((s) => serviceDeploymentEnvironmentKey(s) === key),
    }));
  }

  if (groupBy === "type") {
    const types = [...new Set(services.map((s) => s.type))].sort((a, b) =>
      typeGroupLabel(a).localeCompare(typeGroupLabel(b)),
    );
    return types.map((t) => ({
      key: `type:${t}`,
      label: typeGroupLabel(t),
      services: sorted.filter((s) => s.type === t),
    }));
  }

  const data = sorted.filter((s) => isDataCategory(s.type));
  const plat = sorted.filter((s) => !isDataCategory(s.type));
  const out: ListGroup[] = [];
  if (data.length)
    out.push({ key: "cat:data", label: "Data sources & databases", services: data });
  if (plat.length)
    out.push({ key: "cat:platform", label: "Platform & workloads", services: plat });
  return out;
}

function Chev({ open }: { open: boolean }) {
  return (
    <ChevronRight
      className={cn(
        "size-4 shrink-0 text-muted-foreground transition-transform",
        open && "rotate-90",
      )}
      aria-hidden
    />
  );
}

const GROUP_BY_OPTIONS: { value: DeploymentListGroupBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "environment", label: "Environment" },
  { value: "type", label: "Type" },
  { value: "category", label: "Category" },
];

export function EnvironmentsEnvironmentList({
  services,
  environmentOrder = [],
  groupBy,
  onGroupByChange,
  activeEnvironment,
  selectedServiceId,
  onSelect,
}: {
  services: Service[];
  environmentOrder?: string[];
  groupBy: DeploymentListGroupBy;
  onGroupByChange: (next: DeploymentListGroupBy) => void;
  activeEnvironment: string;
  selectedServiceId?: string | null;
  onSelect: (sel: DeploymentListSelection) => void;
}) {
  const groups = useMemo(
    () => buildGroups(services, groupBy, environmentOrder),
    [services, groupBy, environmentOrder],
  );

  const [open, setOpen] = useState<Record<string, boolean>>({});

  const isOpen = useCallback(
    (k: string) => open[k] !== false,
    [open],
  );

  const toggle = useCallback((k: string) => {
    setOpen((o) => ({ ...o, [k]: o[k] === false ? true : false }));
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 text-foreground sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">
            Deployment inventory
          </h2>
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
            Each card is one deployment. Labels show what belongs to that service. Click the card
            body to open it on the canvas and in the right panel. Use group by to organize the list.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
          <label
            htmlFor="deployment-group-by"
            className="text-xs text-muted-foreground"
          >
            Group by
          </label>
          <select
            id="deployment-group-by"
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value as DeploymentListGroupBy)}
            className="rounded-md border border-border bg-muted px-2 py-1.5 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {GROUP_BY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">No services in this project yet.</p>
      ) : groupBy === "none" ? (
        <ul className="flex flex-col gap-3" aria-label="Deployments">
          {groups[0]?.services.map((svc) => (
            <ServiceBlock
              key={svc.id}
              service={svc}
              groupBy={groupBy}
              selected={selectedServiceId === svc.id}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Deployments">
          {groups.map((g) => {
            const gOpen = isOpen(`g:${g.key}`);
            const envRow = groupBy === "environment";
            const envSelected = envRow && g.key === activeEnvironment;

            return (
              <li
                key={g.key}
                className="overflow-hidden rounded-xl border border-border bg-muted"
              >
                <div className="flex items-stretch">
                  <button
                    type="button"
                    className="flex w-10 shrink-0 items-center justify-center border-r border-border transition-colors hover:bg-white/5"
                    aria-expanded={gOpen}
                    aria-label={gOpen ? "Collapse group" : "Expand group"}
                    onClick={() => toggle(`g:${g.key}`)}
                  >
                    <Chev open={gOpen} />
                  </button>
                  {envRow ? (
                    <button
                      type="button"
                      role="option"
                      aria-selected={envSelected}
                      className={cn(
                        "flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-3 text-left text-sm transition-colors hover:bg-white/5",
                        envSelected ? "bg-primary/10 text-primary" : "text-foreground",
                      )}
                      onClick={() => onSelect({ kind: "environment", key: g.key })}
                    >
                      <span className="font-semibold">{g.label}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {g.services.length} deployment{g.services.length === 1 ? "" : "s"}
                      </span>
                    </button>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-3 text-left text-sm">
                      <span className="font-semibold">{g.label}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {g.services.length}
                      </span>
                    </div>
                  )}
                </div>

                {gOpen ? (
                  <div className="border-t border-border px-2 py-2">
                    {g.services.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground">
                        Nothing in this group.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {g.services.map((svc) => (
                          <ServiceBlock
                            key={svc.id}
                            service={svc}
                            groupBy={groupBy}
                            selected={selectedServiceId === svc.id}
                            onSelect={onSelect}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ServiceBlock({
  service,
  groupBy,
  selected,
  onSelect,
}: {
  service: Service;
  groupBy: DeploymentListGroupBy;
  selected: boolean;
  onSelect: (sel: DeploymentListSelection) => void;
}) {
  const clones = Math.max(0, service.cloneUrlIds?.length ?? 0);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const hasClones = clones > 0;
  const slotCount = hasClones ? clones + 1 : 0;

  const showTypeRow = groupBy !== "type";
  const showEnvironmentRow = groupBy !== "environment";

  return (
    <li className="list-none">
      <div
        className={cn(
          "overflow-hidden rounded-xl border transition-colors",
          selected ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "border-border bg-card",
        )}
      >
        <button
          type="button"
          className="flex w-full gap-3 p-4 text-left transition-colors hover:bg-white/[0.04]"
          onClick={() => onSelect({ kind: "service", service })}
        >
          <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
            <TypeGlyph type={service.type} />
            <span className="max-w-[3.25rem] text-center text-[10px] leading-tight text-muted-foreground">
              {typeGroupLabel(service.type)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Service name
                </div>
                <div className="truncate text-base font-semibold leading-snug">{service.name}</div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  id: {service.id}
                </div>
              </div>
              <StatusPill status={service.status} />
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-3">
              {showTypeRow ? (
                <MetaRow label="Type" value={typeGroupLabel(service.type)} />
              ) : null}
              {showEnvironmentRow ? (
                <MetaRow label="Environment" value={service.environmentName?.trim() ?? ""} />
              ) : null}
              <MetaRow label="Node / host" value={service.nodeName?.trim() ?? ""} mono />
              <MetaRow
                label="Provider"
                value={service.databaseProviderName?.trim() ?? ""}
              />
              <MetaRow label="Version" value={service.databaseVersion?.trim() ?? ""} mono />
              <MetaRow
                label="Clones"
                value={
                  hasClones
                    ? `${clones} branch slot${clones === 1 ? "" : "s"} (+ primary)`
                    : "None"
                }
              />
              {service.type === "external_datasource" && service.externalDatasource ? (
                <MetaRow
                  label="Connector sync"
                  value={service.externalDatasource.syncEnabled ? "Enabled" : "Disabled"}
                />
              ) : null}
            </div>
          </div>
        </button>

        {hasClones ? (
          <div className="border-t border-border bg-background px-4 pb-3 pt-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5"
              aria-expanded={slotsOpen}
              onClick={(e) => {
                e.stopPropagation();
                setSlotsOpen((v) => !v);
              }}
            >
              <Chev open={slotsOpen} />
              <span>
                Database copies & branches
                <span className="ml-1.5 font-mono font-normal text-muted-foreground">
                  ({slotCount} slots)
                </span>
              </span>
            </button>
            {slotsOpen ? (
              <ul className="ml-1 mt-1 space-y-1 border-l-2 border-border pl-3">
                {Array.from({ length: slotCount }, (_, cloneIndex) => {
                  const label = cloneRowLabel(service, cloneIndex);
                  return (
                    <li key={`${service.id}:${cloneIndex}`}>
                      <button
                        type="button"
                        className="w-full rounded-md border border-border bg-muted px-2 py-2 text-left text-xs text-foreground transition-colors hover:bg-white/5"
                        onClick={() => onSelect({ kind: "clone", service, cloneIndex })}
                      >
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {cloneIndex === 0 ? "Primary" : `Clone ${cloneIndex}`}
                        </span>
                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {label}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
