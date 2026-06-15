import { useCallback, useId, useState } from "react";
import { X, Copy, ExternalLink, ChevronRight } from "lucide-react";

import { cn } from "@qlm/ui/utils";

import type { ServiceRightPanelUrlTab } from "../../environment-url-path";
import type { Service } from "./service-card";

export type { ServiceRightPanelUrlTab } from "../../environment-url-path";

/** Shell width for docked service detail panel (must match `ServiceTreeView` slide-out). */
export const SERVICE_RIGHT_PANEL_WIDTH_PX = 380;

export type ServiceRightPanelChromeVariant =
  | "default"
  | "environment-canvas"
  | "service-topology";

interface ServiceRightPanelProps {
  service: Service | null;
  onClose: () => void;
  /** When showing a clone, extra line under the title (e.g. parent · replica). */
  subtitle?: string | null;
  activePanelTab?: ServiceRightPanelUrlTab;
  onPanelTabChange?: (tab: ServiceRightPanelUrlTab) => void;
  /** Host chrome: canvas dock vs service-workspace topology dock. */
  chromeVariant?: ServiceRightPanelChromeVariant;
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const w = 120;
  const h = 36;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h * 0.85 - 2;
    return `${x},${y}`;
  });
  const path = `M${pts.join(" L")}`;
  const gradId = useId().replace(/:/g, "");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("block", className)}
    >
      <defs>
        <linearGradient id={`sg-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M${pts[0] ?? `0,${h}`} L${pts.join(" L")} L${w},${h} L0,${h} Z`}
        fill={`url(#sg-${gradId})`}
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  sub,
  data,
  sparklineClassName,
}: {
  label: string;
  value: string;
  sub: string;
  data: number[];
  sparklineClassName?: string;
}) {
  return (
    <div className="border border-border bg-muted px-3.5 py-3">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="text-xl font-bold leading-none text-foreground">{value}</span>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
      <Sparkline data={data} className={sparklineClassName ?? "text-green-500"} />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 border border-border bg-muted px-3 py-2.5">
      <div className="mb-1 text-[10px] text-muted-foreground">{label}</div>
      <div className="text-base font-bold text-foreground">{value}</div>
    </div>
  );
}

function ConnectionBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="flex items-center gap-2 border border-border bg-background px-3 py-2 font-mono text-[11px]">
      <span className="mr-1 text-primary">$</span>
      <span className="min-w-0 flex-1 truncate text-foreground">{value}</span>
      <button
        type="button"
        onClick={copy}
        title="Copy"
        className={cn(
          "shrink-0 border-0 bg-transparent p-0",
          copied ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Copy className="h-[13px] w-[13px]" />
      </button>
    </div>
  );
}

const CPU_DATA = [12, 18, 14, 20, 15, 10, 12, 18, 16, 14, 12, 16, 20, 15, 12];
const MEM_DATA = [60, 62, 61, 63, 62, 64, 63, 65, 64, 63, 62, 63, 65, 64, 62];

function connectionString(service: Service) {
  switch (service.type) {
    case "postgres":
      return `postgres://admin@${service.name.toLowerCase()}-primary.internal:5432/main`;
    case "redis":
      return `redis://:password@${service.name.toLowerCase()}.internal:6379`;
    case "mongo":
      return `mongodb://admin@${service.name.toLowerCase()}.internal:27017/main`;
    case "mysql":
      return `mysql://admin@${service.name.toLowerCase()}-primary.internal:3306/main`;
    case "external_datasource":
      return `https://connect.qlm.dev/datasources/${service.id}`;
    default:
      return `http://${service.name.toLowerCase()}.internal:8080`;
  }
}

function serviceLabel(service: Service) {
  const map: Record<string, string> = {
    postgres: "Source DB",
    redis: "Cache",
    mongo: "Document DB",
    mysql: "Source DB",
    web: "Web Service",
    worker: "Worker",
    cron: "Cron Job",
    bucket: "Bucket",
    external_datasource: "External datasource",
  };
  return map[service.type] ?? "Service";
}

function isDatabase(service: Service) {
  return ["postgres", "redis", "mongo", "mysql"].includes(service.type);
}

type PanelTab = ServiceRightPanelUrlTab;

const TABS: { id: PanelTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "logs", label: "Logs" },
  { id: "schema", label: "Schema" },
  { id: "variables", label: "Variables" },
  { id: "settings", label: "Settings" },
];

function TabBar({ active, onChange }: { active: PanelTab; onChange: (t: PanelTab) => void }) {
  return (
    <div className="flex gap-0 border-b border-border px-5">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "-mb-px cursor-pointer border-0 border-b-2 bg-transparent px-2.5 py-2 text-[11px]",
            active === t.id
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function OverviewPanel({ service }: { service: Service }) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Connection info</span>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] text-primary"
          >
            <ExternalLink className="h-[11px] w-[11px]" />
            More details
          </button>
        </div>
        <div className="mb-1.5 text-[10px] text-muted-foreground">Primary connection string</div>
        <ConnectionBox value={connectionString(service)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="CPU" value="0.5" sub="1% used" data={CPU_DATA} />
        <MetricCard
          label="Memory"
          value="2 GiB"
          sub="8% used"
          data={MEM_DATA}
          sparklineClassName="text-primary"
        />
      </div>

      {isDatabase(service) && (
        <div className="border border-border bg-muted px-3.5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-1 text-[10px] text-muted-foreground">Storage used</div>
              <div className="text-xl font-bold text-foreground">614 MiB</div>
            </div>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] text-primary"
            >
              <ExternalLink className="h-[11px] w-[11px]" />
              More storage details
            </button>
          </div>
        </div>
      )}

      {isDatabase(service) && (
        <div className="flex gap-2">
          <StatBox label="Connections" value="24" />
          <StatBox label="Queries / s" value="312" />
          <StatBox label="Avg latency" value="1.4 ms" />
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold text-foreground">Lineage</div>
        <div className="flex items-center gap-1.5 border border-border bg-muted px-3 py-2.5 text-[11px]">
          <span className="text-green-500">Production (Source)</span>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="text-amber-500">Staging</span>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">2 child envs</span>
        </div>
      </div>
    </div>
  );
}

const LOG_LINES = [
  "2026-03-30 18:53:52 LOG: starting PostgreSQL 18.3 on x86_64",
  "2026-03-30 18:53:52 LOG: listening on IPv4 address \"0.0.0.0\", port 5432",
  "2026-03-30 18:53:52 LOG: database system was shut down at 2026-03-30 18:53:52 UTC",
  "2026-03-30 18:53:52 LOG: database system is ready to accept connections",
  "2026-03-30 20:12:14 LOG: checkpoint starting: time",
  "2026-03-30 20:12:14 LOG: checkpoint complete: wrote 943 buffers",
  "2026-03-30 20:14:01 LOG: autovacuum: processing database \"main\"",
];

function LogsPanel() {
  return (
    <div className="flex-1 overflow-y-auto bg-background font-mono text-[11px]">
      {LOG_LINES.map((line, i) => (
        <div
          key={i}
          className={cn(
            "px-4 py-0.5 text-muted-foreground",
            i % 3 === 0 ? "border-l-2 border-primary" : "border-l-2 border-transparent",
          )}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

const TABLES = [
  { name: "users", cols: 8, rows: "12,453", size: "48 MB" },
  { name: "orders", cols: 6, rows: "34,891", size: "128 MB" },
  { name: "payments", cols: 6, rows: "28,744", size: "96 MB" },
  { name: "sessions", cols: 5, rows: "5,201", size: "12 MB" },
];

function SchemaPanel() {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="mb-2 text-[10px] text-muted-foreground">{TABLES.length} TABLES</div>
      <div className="flex flex-col gap-1.5">
        {TABLES.map((t) => (
          <div
            key={t.name}
            className="flex items-center gap-3 border border-border bg-muted px-3.5 py-2.5 text-[11px]"
          >
            <span className="text-primary">⊞</span>
            <span className="min-w-0 flex-1 font-mono text-foreground">{t.name}</span>
            <span className="text-muted-foreground">{t.cols} cols</span>
            <span className="text-muted-foreground">{t.rows} rows</span>
            <span className="text-muted-foreground">{t.size}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold text-foreground">Connection</div>
        <ConnectionBox value="postgres://staging-db.qlm.dev:5432/main" />
      </div>
    </div>
  );
}

const VARS = [
  { key: "DATABASE_URL", value: "postgres://user:***@host:5432/main" },
  { key: "PGUSER", value: "postgres" },
  { key: "PGPASSWORD", value: "••••••••" },
  { key: "PGDATABASE", value: "main" },
  { key: "PGHOST", value: "postgres.internal" },
  { key: "PGPORT", value: "5432" },
];

function VariablesPanel() {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="flex flex-col gap-1.5">
        {VARS.map((v) => (
          <div
            key={v.key}
            className="flex items-center gap-3 border border-border bg-muted px-3.5 py-2 text-[11px]"
          >
            <span className="w-40 shrink-0 font-mono text-primary">{v.key}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
              {v.value}
            </span>
            <Copy className="h-3 w-3 shrink-0 cursor-pointer text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ service }: { service: Service }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="flex flex-col gap-3.5">
        {[
          { label: "Service Name", value: service.name },
          { label: "Region", value: "us-east-1" },
          { label: "Version", value: "18.3" },
        ].map((f) => (
          <div key={f.label}>
            <div className="mb-1.5 text-[10px] text-muted-foreground">{f.label}</div>
            <input
              defaultValue={f.value}
              className="box-border w-full border border-border bg-muted px-2.5 py-1.5 text-[11px] text-foreground outline-none"
            />
          </div>
        ))}
        <div className="pt-2">
          <div className="mb-2 text-[11px] font-semibold text-destructive">Danger Zone</div>
          <button
            type="button"
            className="cursor-pointer border border-destructive bg-transparent px-3.5 py-1.5 text-[11px] text-destructive"
          >
            Delete Service
          </button>
        </div>
      </div>
    </div>
  );
}

const CHROME: Record<
  ServiceRightPanelChromeVariant,
  { eyebrow: string; badge: string; root: string }
> = {
  default: {
    eyebrow: "Service Info",
    badge: "● Primary",
    root: "flex h-full w-full flex-col overflow-hidden border-l border-border bg-card",
  },
  "environment-canvas": {
    eyebrow: "Environments",
    badge: "Canvas",
    root: "flex h-full w-full flex-col overflow-hidden border-l border-border bg-card",
  },
  "service-topology": {
    eyebrow: "Service workspace",
    badge: "Topology",
    root: "flex h-full w-full flex-col overflow-hidden border-l border-primary/30 bg-card",
  },
};

export function ServiceRightPanel({
  service,
  onClose,
  subtitle,
  activePanelTab,
  onPanelTabChange,
  chromeVariant = "default",
}: ServiceRightPanelProps) {
  const [internalTab, setInternalTab] = useState<PanelTab>("overview");
  const isControlled =
    activePanelTab !== undefined && onPanelTabChange !== undefined;
  const tab = isControlled ? activePanelTab! : internalTab;
  const handleTabChange = useCallback(
    (t: PanelTab) => {
      onPanelTabChange?.(t);
      if (!isControlled) setInternalTab(t);
    },
    [isControlled, onPanelTabChange],
  );

  if (!service) return null;

  const chrome = CHROME[chromeVariant];

  return (
    <div className={chrome.root}>
      <div className="shrink-0 border-b border-border px-4 pb-2.5 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {chrome.eyebrow}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-sm border border-primary px-2 py-0.5 text-[10px] text-primary">
              {chrome.badge}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex cursor-pointer border-0 bg-transparent p-0.5 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="text-[15px] font-bold leading-tight text-foreground">
          {serviceLabel(service)}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {service.type} · {service.name}
        </div>
        {subtitle ? (
          <div className="mt-1 text-[10px] italic text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>

      <TabBar active={tab} onChange={handleTabChange} />

      {tab === "overview" && <OverviewPanel service={service} />}
      {tab === "logs" && <LogsPanel />}
      {tab === "schema" && <SchemaPanel />}
      {tab === "variables" && <VariablesPanel />}
      {tab === "settings" && <SettingsPanel service={service} />}
    </div>
  );
}
