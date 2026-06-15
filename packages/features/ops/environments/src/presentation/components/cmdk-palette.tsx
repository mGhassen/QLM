import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";

import { cn } from "@qlm/ui/utils";
import {
  Database,
  MessageSquare,
  Search,
  ChevronRight,
  Plus,
  Link2,
  ArrowRight,
  Server,
  Cpu,
  HardDrive,
  Zap,
} from "lucide-react";
import type { ServiceType } from "./service-card";

export interface AddServicePayload {
  name: string;
  type: ServiceType;
  status: "online" | "deploying" | "offline" | "error";
  image?: string;
}

interface CmdKPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddService?: (payload: AddServicePayload) => void;
  onNavigate?: (action: string) => void;
  /** Pre-navigate to a specific step on open */
  openTo?: { screen: Screen; dbType?: ServiceType };
  /**
   * `layout` — `absolute inset-0` inside the environments shell (nearest `relative` host).
   * `viewport` — `fixed` fullscreen (e.g. Storybook without a sized host).
   */
  overlay?: "layout" | "viewport";
}

export type Screen = "root" | "db-choose" | "new-db" | "db-config" | "datasource";

const DB_OPTIONS: { label: string; icon: string; type: ServiceType; desc: string }[] = [
  { label: "PostgreSQL", icon: "🐘", type: "postgres", desc: "Relational · SQL" },
  { label: "Redis",      icon: "🟥", type: "redis",    desc: "In-memory · Key-value" },
  { label: "MongoDB",    icon: "🍃", type: "mongo",    desc: "Document · NoSQL" },
  { label: "MySQL",      icon: "🐬", type: "mysql",    desc: "Relational · SQL" },
];

const NODES    = ["us-east-1a", "us-east-1b", "eu-west-1a", "eu-central-1a", "ap-southeast-1a"];
const COMPUTES = ["1 vCPU · 1 GB", "2 vCPU · 4 GB", "4 vCPU · 8 GB", "8 vCPU · 16 GB"];
const STORAGES = ["10 GB", "50 GB", "100 GB", "500 GB", "1 TB"];
const PERF_PROFILES = [
  { label: "Basic",            desc: "Dev / low traffic"         },
  { label: "Standard",         desc: "General workloads"         },
  { label: "High Performance", desc: "Latency-sensitive apps"    },
  { label: "Extreme",          desc: "Mission-critical / OLTP"   },
];

const ROOT_ITEMS = [
  { label: "Database", icon: Database,     action: "database", desc: "Add a new database or external datasource" },
  { label: "Chat",     icon: MessageSquare, action: "chat",    desc: "Open AI chat panel" },
];

function OptionPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer whitespace-nowrap rounded px-2.5 py-1 text-[11px] transition-all duration-150",
        active
          ? "border border-primary bg-primary/10 text-primary"
          : "border border-border bg-transparent text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <Icon className="h-[11px] w-[11px] text-muted-foreground" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

export function CmdKPalette({
  open,
  onOpenChange,
  onAddService,
  onNavigate,
  openTo,
  overlay = "layout",
}: CmdKPaletteProps) {
  const [search, setSearch]     = useState("");
  const [screen, setScreen]     = useState<Screen>("root");

  // datasource state
  const [dsName, setDsName]     = useState("");
  const [dsConn, setDsConn]     = useState("");
  const [dsType, setDsType]     = useState<ServiceType>("postgres");

  // db-config state
  const [selectedDb, setSelectedDb]     = useState<typeof DB_OPTIONS[0] | null>(null);
  const [dbName, setDbName]             = useState("");
  const [dbNode, setDbNode]             = useState(NODES[0]!);
  const [dbCompute, setDbCompute]       = useState(COMPUTES[1]!);
  const [dbStorage, setDbStorage]       = useState(STORAGES[1]!);
  const [dbPerfProfile, setDbPerfProfile] = useState(PERF_PROFILES[1]!.label);

  function selectDb(db: typeof DB_OPTIONS[0]) {
    setSelectedDb(db);
    setDbName(db.label.toLowerCase().replace(/\s+/g, "-"));
    setScreen("db-config");
    setSearch("");
  }

  const reset = useCallback(() => {
    setSearch("");
    setScreen("root");
    setDsName(""); setDsConn(""); setDsType("postgres");
    setSelectedDb(null); setDbName("");
    setDbNode(NODES[0]!); setDbCompute(COMPUTES[1]!);
    setDbStorage(STORAGES[1]!); setDbPerfProfile(PERF_PROFILES[1]!.label);
  }, []);

  // Apply openTo when palette opens
  useEffect(() => {
    if (open && openTo) {
      setScreen(openTo.screen);
      if (openTo.dbType) {
        const db = DB_OPTIONS.find((d) => d.type === openTo.dbType);
        if (db) selectDb(db);
      }
    }
    if (!open) reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") {
        if (screen === "db-config") { e.preventDefault(); setScreen("new-db"); setSearch(""); }
        else if (screen === "new-db" || screen === "datasource") { e.preventDefault(); setScreen("db-choose"); setSearch(""); }
        else if (screen !== "root") { e.preventDefault(); setScreen("root"); setSearch(""); }
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange, screen]);

  function addAndClose(payload: AddServicePayload) {
    onAddService?.(payload);
    onOpenChange(false);
  }

  function handleRootSelect(action: string) {
    if (action === "database") { setScreen("db-choose"); setSearch(""); }
    if (action === "chat")     { onNavigate?.("open-chat"); onOpenChange(false); }
  }

  function goBack() {
    if (screen === "db-config")  { setScreen("new-db");    setSearch(""); }
    else if (screen === "new-db" || screen === "datasource") { setScreen("db-choose"); setSearch(""); }
    else { setScreen("root"); setSearch(""); }
  }

  if (!open) return null;

  function Breadcrumb({ label }: { label: string }) {
    return (
      <button
        type="button"
        onClick={goBack}
        className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs text-primary transition-colors bg-primary/15"
      >
        <ChevronRight className="h-3 w-3 rotate-180" />
        {label}
      </button>
    );
  }

  const isDbConfig = screen === "db-config";

  return (
    <div
      className={cn(
        "z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm",
        overlay === "layout" ? "absolute inset-0" : "fixed inset-0",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="overflow-hidden border border-border bg-card shadow-2xl transition-[width] duration-200 ease-out"
        style={{ width: isDbConfig ? 600 : 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} loop>

          {/* ── ROOT ──────────────────────────────────────────────────────── */}
          {screen === "root" && (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="What would you like to do?"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none"
                  autoFocus
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="px-1.5 text-xs text-muted-foreground"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              <Command.List className="py-2">
                <Command.Group>
                  {ROOT_ITEMS.filter((i) => !search || i.label.toLowerCase().includes(search.toLowerCase())).map((item) => (
                    <Command.Item
                      key={item.action} value={item.label}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-foreground transition-colors"
                      onSelect={() => handleRootSelect(item.action)}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{item.label}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">No results for "{search}"</Command.Empty>
              </Command.List>
            </>
          )}

          {/* ── DB CHOOSE ─────────────────────────────────────────────────── */}
          {screen === "db-choose" && (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Breadcrumb label="Database" />
              </div>
              <Command.List className="py-2">
                <Command.Group>
                  <Command.Item
                    value="new-database"
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-foreground transition-colors"
                    onSelect={() => { setScreen("new-db"); setSearch(""); }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">New Database</div>
                      <div className="text-xs text-muted-foreground">Provision a managed database instance</div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Command.Item>
                  <Command.Item
                    value="external-datasource"
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-foreground transition-colors"
                    onSelect={() => { setScreen("datasource"); setSearch(""); }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted">
                      <Link2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">External Datasource</div>
                      <div className="text-xs text-muted-foreground">Connect to an existing database via connection string</div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </>
          )}

          {/* ── NEW DB (pick type) ─────────────────────────────────────────── */}
          {screen === "new-db" && (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Breadcrumb label="New Database" />
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Command.Input
                  value={search} onValueChange={setSearch}
                  placeholder="Search databases..."
                  className="flex-1 bg-transparent text-sm text-foreground outline-none"
                  autoFocus
                />
              </div>
              <Command.List className="py-2">
                {DB_OPTIONS.filter((db) => !search || db.label.toLowerCase().includes(search.toLowerCase())).map((db) => (
                  <Command.Item
                    key={db.label} value={db.label}
                    className="flex cursor-pointer items-center gap-4 px-4 py-3 text-sm text-foreground transition-colors"
                    onSelect={() => selectDb(db)}
                  >
                    <span className="w-8 shrink-0 text-center text-xl">{db.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{db.label}</div>
                      <div className="text-xs text-muted-foreground">{db.desc}</div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Command.Item>
                ))}
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No database matching "{search}"</Command.Empty>
              </Command.List>
            </>
          )}

          {/* ── DB CONFIG ─────────────────────────────────────────────────── */}
          {screen === "db-config" && selectedDb && (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Breadcrumb label={selectedDb.label} />
                <span className="text-[13px] text-muted-foreground">{selectedDb.icon}</span>
                <span className="min-w-0 flex-1 text-[13px] font-semibold text-foreground">Configure {selectedDb.label}</span>
              </div>

              <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4">

                {/* Name */}
                <div>
                  <FieldLabel icon={Database}>Name</FieldLabel>
                  <input
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    placeholder="my-database"
                    autoFocus
                    className="w-full border border-border bg-muted px-3 py-2 font-mono text-sm text-foreground outline-none"
                  />
                </div>

                {/* Node */}
                <div>
                  <FieldLabel icon={Server}>Node</FieldLabel>
                  <div className="relative">
                    <select
                      value={dbNode}
                      onChange={(e) => setDbNode(e.target.value)}
                      className="w-full cursor-pointer appearance-none border border-border bg-muted px-3 py-1.5 font-inherit text-xs text-foreground outline-none"
                    >
                      {NODES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-90 text-muted-foreground" />
                  </div>
                </div>

                {/* Compute */}
                <div>
                  <FieldLabel icon={Cpu}>Compute</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {COMPUTES.map((c) => (
                      <OptionPill key={c} label={c} active={dbCompute === c} onClick={() => setDbCompute(c)} />
                    ))}
                  </div>
                </div>

                {/* Storage */}
                <div>
                  <FieldLabel icon={HardDrive}>Storage</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {STORAGES.map((s) => (
                      <OptionPill key={s} label={s} active={dbStorage === s} onClick={() => setDbStorage(s)} />
                    ))}
                  </div>
                </div>

                {/* Performance Profile */}
                <div>
                  <FieldLabel icon={Zap}>Performance Profile</FieldLabel>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PERF_PROFILES.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setDbPerfProfile(p.label)}
                        className={cn(
                          "cursor-pointer border px-3 py-2 text-left transition-all duration-150",
                          dbPerfProfile === p.label
                            ? "border-primary bg-primary/10"
                            : "border-border bg-transparent",
                        )}
                      >
                        <div className={cn("text-xs font-semibold", dbPerfProfile === p.label ? "text-primary" : "text-foreground")}>{p.label}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary strip */}
                <div className="flex flex-wrap gap-4 border border-border bg-background px-3 py-2.5">
                  {[
                    { label: "Node",    value: dbNode },
                    { label: "Compute", value: dbCompute },
                    { label: "Storage", value: dbStorage },
                    { label: "Profile", value: dbPerfProfile },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</div>
                      <div className="mt-0.5 text-[11px] text-foreground">{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Create button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!dbName.trim()) return;
                    addAndClose({
                      name: dbName.trim(),
                      type: selectedDb.type,
                      status: "deploying",
                    });
                  }}
                  disabled={!dbName.trim()}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 border-0 py-2.5 text-[13px] font-bold transition-all duration-150",
                    dbName.trim()
                      ? "cursor-pointer bg-primary text-primary-foreground"
                      : "cursor-not-allowed bg-muted text-muted-foreground",
                  )}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Create {selectedDb.label}
                </button>
              </div>
            </>
          )}

          {/* ── EXTERNAL DATASOURCE ───────────────────────────────────────── */}
          {screen === "datasource" && (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Breadcrumb label="External Datasource" />
              </div>
              <div className="flex flex-col gap-3 px-4 py-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
                  <input
                    value={dsName} onChange={(e) => setDsName(e.target.value)}
                    placeholder="my-production-db"
                    className="w-full border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connection String</label>
                  <input
                    value={dsConn} onChange={(e) => setDsConn(e.target.value)}
                    placeholder="postgresql://user:pass@host:5432/db"
                    className="w-full border border-border bg-muted px-3 py-2 font-mono text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {DB_OPTIONS.map((db) => (
                      <button
                        key={db.type}
                        type="button"
                        onClick={() => setDsType(db.type)}
                        className={cn(
                          "flex items-center gap-1.5 border px-3 py-1.5 text-xs transition-colors",
                          dsType === db.type
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-transparent text-muted-foreground",
                        )}
                      >
                        <span>{db.icon}</span>{db.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!dsName.trim() || !dsConn.trim()) return;
                    addAndClose({ name: dsName.trim(), type: dsType, status: "online" });
                  }}
                  disabled={!dsName.trim() || !dsConn.trim()}
                  className={cn(
                    "mt-1 flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all",
                    dsName.trim() && dsConn.trim()
                      ? "cursor-pointer bg-primary text-primary-foreground"
                      : "cursor-not-allowed bg-muted text-muted-foreground",
                  )}
                >
                  <ArrowRight className="h-4 w-4" />
                  Connect Datasource
                </button>
              </div>
            </>
          )}

        </Command>
      </div>
    </div>
  );
}
