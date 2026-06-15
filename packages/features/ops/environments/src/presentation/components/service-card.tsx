import { useState, type Ref } from "react";
import { cn } from "@qlm/ui/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@qlm/ui/context-menu";
import {
  Copy,
  Terminal,
  SlidersHorizontal,
  Zap,
  Braces,
  BarChart2,
  Settings,
  Trash2,
  HardDrive,
  Network,
  Layers,
  Link2,
  FolderSync,
  Box,
} from "lucide-react";

const DATA_SERVICE_HEADER_FALLBACK: Partial<Record<ServiceType, string>> = {
  postgres: "PostgreSQL",
  redis: "Redis",
  mongo: "MongoDB",
  mysql: "MySQL",
  external_datasource: "External data",
};

export type ServiceStatus = "online" | "deploying" | "offline" | "error";
export type ServiceType =
  | "postgres"
  | "redis"
  | "mongo"
  | "mysql"
  | "external_datasource"
  | "web"
  | "worker"
  | "cron"
  | "bucket";

export interface Service {
  id: string;
  name: string;
  type: ServiceType;
  status: ServiceStatus;
  image?: string;
  x?: number;
  y?: number;
  /** Globally unique id for workspace URL `/environment/{urlId}` (mock / routing). */
  urlId?: number;
  /** One id per clone / branch slot; length drives topology + URL routing under `/environment/`. */
  cloneUrlIds?: number[];
  /**
   * Topology tree row: root service this row belongs to (for URL lookup when `urlId` is not on
   * {@link cloneUrlIds} — e.g. nested forks in {@link flattenCloneForest}).
   */
  topologyRoot?: Service;
  environmentName?: string;
  databaseProviderName?: string;
  databaseProviderLogoUrl?: string;
  databaseVersion?: string;
  nodeName?: string;
  nodeCloudProviderLogoUrl?: string;
  /** Present for `external_datasource` — whether the connector syncs into the mesh. */
  externalDatasource?: { syncEnabled: boolean };
  /** Service workspace: single card representing many clones before expand. */
  mergedCloneStackPreview?: { total: number };
  /** Clone row: whether this branch has data masking enabled (footer variant). */
  dataMaskingEnabled?: boolean;
}

interface ServiceCardProps {
  service: Service;
  /** RF: measure painted box vs node shell for handle/edge alignment. */
  measureRef?: Ref<HTMLDivElement>;
  onClick?: (service: Service) => void;
  onExpand?: (service: Service) => void;
  selected?: boolean;
  /**
   * Stacked card backs (clone layers). When omitted, follows `service.cloneUrlIds?.length > 0`.
   */
  stacked?: boolean;
  /** When `onExpand` is set: show the workspace control only on hover, or always (split click vs workspace). */
  workspaceButtonVisibility?: "hover" | "always";
}

function isDataServiceType(type: ServiceType) {
  return (
    type === "external_datasource" ||
    type === "postgres" ||
    type === "redis" ||
    type === "mongo" ||
    type === "mysql"
  );
}

function ServiceIcon({ type }: { type: ServiceType }) {
  if (type === "external_datasource") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-secondary">
        <Link2 className="size-4 text-primary" />
      </div>
    );
  }
  if (type === "postgres") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-muted text-lg">
        🐘
      </div>
    );
  }
  if (type === "redis") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-muted text-lg">
        🟥
      </div>
    );
  }
  if (type === "mongo") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-muted text-lg">
        🍃
      </div>
    );
  }
  if (type === "mysql") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-muted text-lg">
        🐬
      </div>
    );
  }
  if (type === "web") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none bg-primary/15">
        <Network className="size-4 text-primary" />
      </div>
    );
  }
  if (type === "bucket") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none bg-primary/10">
        <HardDrive className="size-4 text-primary" />
      </div>
    );
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-none bg-muted">
      <HardDrive className="size-4 text-muted-foreground" />
    </div>
  );
}

const STATUS_TITLE: Record<ServiceStatus, string> = {
  online: "Online",
  deploying: "Deploying",
  offline: "Offline",
  error: "Error",
};

function StatusDot({ status }: { status: ServiceStatus }) {
  const cls: Record<ServiceStatus, string> = {
    online: "bg-emerald-500",
    deploying: "bg-amber-500",
    offline: "bg-muted-foreground",
    error: "bg-destructive",
  };
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", cls[status])}
    />
  );
}

function ExternalDatasourceSyncIcon({
  syncEnabled,
  status,
  tone = "default",
}: {
  syncEnabled: boolean;
  status: ServiceStatus;
  /** `footer` = tray under body (readable on `bg-muted`). */
  tone?: "default" | "ghost" | "footer";
}) {
  const colorClass =
    tone === "footer"
      ? !syncEnabled
        ? "text-secondary-foreground/55"
        : status === "error" || status === "offline"
          ? "text-destructive"
          : status === "deploying"
            ? "text-primary"
            : "text-emerald-300"
      : tone === "ghost"
        ? !syncEnabled
          ? "text-amber-950/45"
          : status === "error" || status === "offline"
            ? "text-red-800"
            : status === "deploying"
              ? "text-amber-900"
              : "text-emerald-900"
        : !syncEnabled
          ? "text-destructive"
          : status === "error" || status === "offline"
            ? "text-destructive"
            : status === "deploying"
              ? "text-amber-500"
              : "text-emerald-500";

  const title = !syncEnabled
    ? "Disabled"
    : status === "error"
      ? STATUS_TITLE.error
      : status === "offline"
        ? STATUS_TITLE.offline
        : status === "deploying"
          ? STATUS_TITLE.deploying
          : STATUS_TITLE.online;

  return (
    <span className="flex items-center" title={title}>
      <FolderSync className={cn("size-3.5 shrink-0", colorClass)} aria-hidden />
    </span>
  );
}

function ProviderLogo({
  url,
  label,
  size = 22,
  /** No outer frame — use for small cloud marks (e.g. node row) so logos are not double-bordered. */
  plain = false,
}: {
  url?: string;
  label: string;
  size?: number;
  plain?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className={cn(
          "shrink-0 object-contain",
          plain
            ? "rounded-sm bg-transparent"
            : "rounded-none border border-border-subtle bg-muted",
        )}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center text-[10px] font-bold text-muted-foreground",
        plain
          ? "rounded-sm bg-transparent"
          : "rounded-none border border-border-subtle bg-muted",
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ServiceWorkspaceActionButton({
  service,
  visible,
  onExpand,
}: {
  service: Service;
  visible: boolean;
  onExpand?: (s: Service) => void;
}) {
  if (!visible || !onExpand) return null;
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onExpand(service);
      }}
      title="Open service workspace"
      aria-label="Open service workspace"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md",
        "text-primary/80 transition-[background-color,color] duration-150",
        "hover:bg-muted/45 hover:text-primary",
        "active:bg-muted/65",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30",
      )}
    >
      <Layers className="size-3.5" aria-hidden />
    </button>
  );
}

function ServiceWorkspaceActionSlot({
  service,
  onExpand,
  workspaceButtonVisibility,
  showWorkspaceBtn,
}: {
  service: Service;
  onExpand?: (s: Service) => void;
  workspaceButtonVisibility: "hover" | "always";
  showWorkspaceBtn: boolean;
}) {
  if (!onExpand) return null;
  if (workspaceButtonVisibility === "hover" && !showWorkspaceBtn) {
    return <span className="size-6 shrink-0" aria-hidden />;
  }
  return (
    <ServiceWorkspaceActionButton
      service={service}
      visible={showWorkspaceBtn}
      onExpand={onExpand}
    />
  );
}

export function ServiceCard({
  service,
  measureRef,
  onClick,
  onExpand,
  selected,
  stacked,
  workspaceButtonVisibility = "hover",
}: ServiceCardProps) {
  const [hovered, setHovered] = useState(false);
  const showWorkspaceBtn =
    Boolean(onExpand) &&
    (workspaceButtonVisibility === "always" || hovered);
  const dataPlane = isDataServiceType(service.type);
  const providerLabel = service.databaseProviderName ?? service.name;
  const externalSync =
    service.type === "external_datasource" ? service.externalDatasource : undefined;
  const inferredStacked = (service.cloneUrlIds?.length ?? 0) > 0;
  const hasClones = stacked ?? inferredStacked;
  const cardWidth = dataPlane ? "w-[236px]" : "w-[200px]";
  const showStackedFooter =
    dataPlane && (externalSync != null || Boolean(service.nodeName));
  const dataHeaderLabel =
    service.environmentName?.trim() ||
    DATA_SERVICE_HEADER_FALLBACK[service.type] ||
    "Data service";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={measureRef}
          className={cn(
            "relative shrink-0 outline-none rounded-2xl",
            cardWidth,
            "group",
            "transition-[box-shadow,ring] duration-300 ease-out",
            /* Reserve space so clone “backs” peek above the front card (~11px step per layer). */
            hasClones && "pt-[22px]",
            hasClones && selected && "border-[0.5px] border-primary",
            /* Box-shadow on this shell: inner face uses overflow-hidden, which clips shadows on the same node. */
            !selected &&
              !hovered &&
              cn("shadow-xs", "dark:shadow-svc-card-dark-idle"),
            !selected &&
              hovered &&
              cn("shadow-lg", "dark:shadow-svc-card-dark-hover"),
            selected && cn("shadow-xl", "dark:shadow-svc-card-dark-selected"),
            selected && !hasClones && "ring-2 ring-primary/25",
          )}
        >
          {hasClones ? (
            <>
              {/* Solid bases so the padded peek strip does not show canvas through (read as a “gap” under the selection border). */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24 rounded-2xl border border-border/60 bg-card shadow-none"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-[11px] z-[1] h-24 rounded-2xl border border-border/80 bg-card/88 shadow-none"
                aria-hidden
              />
            </>
          ) : null}
          <div
            className={cn(
              "relative z-[2] flex cursor-pointer flex-col overflow-hidden bg-card text-card-foreground select-none",
              hasClones ? "w-full min-w-0" : cardWidth,
              "rounded-2xl",
              hasClones
                ? cn(
                    showStackedFooter ? "border border-border" : "border-subtle-frame",
                    "shadow-none",
                  )
                : cn(
                    selected
                      ? "border-[0.5px] border-primary"
                      : showStackedFooter
                        ? "border border-border"
                        : "border-subtle-frame",
                  ),
            )}
            onClick={() => onClick?.(service)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
          {dataPlane ? (
            <div
              className={cn(
                "relative z-[1] shrink-0 border-b border-dashed border-border/70 bg-card px-4 pt-2.5 pb-2.5",
                "rounded-t-2xl",
              )}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Box className="size-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {dataHeaderLabel}
                  </span>
                </div>
                <ServiceWorkspaceActionSlot
                  service={service}
                  onExpand={onExpand}
                  workspaceButtonVisibility={workspaceButtonVisibility}
                  showWorkspaceBtn={showWorkspaceBtn}
                />
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "relative z-[1] bg-card px-4 pt-3 pb-3",
              dataPlane &&
                showStackedFooter &&
                cn("rounded-b-2xl", "shadow-lg", "dark:shadow-svc-card-dark-footer"),
            )}
          >
            {dataPlane ? (
              <>
                <div className="mb-2 flex min-w-0 flex-col gap-1.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="flex shrink-0 items-center"
                      title={STATUS_TITLE[service.status]}
                    >
                      <StatusDot status={service.status} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {service.name}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-start gap-2">
                    <ProviderLogo
                      url={service.databaseProviderLogoUrl}
                      label={providerLabel}
                      size={22}
                      plain
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold leading-tight text-muted-foreground">
                        {service.databaseProviderName ?? "Database"}
                      </div>
                      {service.databaseVersion ? (
                        <div className="mt-0.5 text-[10px] text-muted-foreground/90">
                          v{service.databaseVersion}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ServiceIcon type={service.type} />
                  <span
                    className="flex shrink-0 items-center"
                    title={STATUS_TITLE[service.status]}
                  >
                    <StatusDot status={service.status} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {service.name}
                  </span>
                </div>
                <ServiceWorkspaceActionSlot
                  service={service}
                  onExpand={onExpand}
                  workspaceButtonVisibility={workspaceButtonVisibility}
                  showWorkspaceBtn={showWorkspaceBtn}
                />
              </div>
            )}
          </div>

          {showStackedFooter ? (
            <div
              className={cn(
                "relative z-0 -mt-3 flex shrink-0 items-center border-t border-border bg-secondary px-4 py-4 text-secondary-foreground transition-[filter,background-color] duration-200",
                "group-hover:brightness-[1.03]",
              )}
            >
              <div className="flex min-w-0 w-full translate-y-1.5 items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {externalSync ? (
                    <ExternalDatasourceSyncIcon
                      syncEnabled={externalSync.syncEnabled}
                      status={service.status}
                      tone="footer"
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 max-w-[58%] flex-1 items-center justify-end gap-2">
                  {service.nodeName ? (
                    <>
                      {service.nodeCloudProviderLogoUrl ? (
                        <ProviderLogo
                          url={service.nodeCloudProviderLogoUrl}
                          label={service.nodeName}
                          size={14}
                          plain
                        />
                      ) : null}
                      <span className="truncate font-mono text-[11px] font-medium text-secondary-foreground">
                        {service.nodeName}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56 rounded-none border border-border-subtle bg-popover py-1 text-popover-foreground shadow-xl">
        {onExpand ? (
          <ContextMenuItem
            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-foreground focus:text-foreground"
            onSelect={() => onExpand(service)}
          >
            <Layers className="size-4 text-primary" />
            Open service workspace
          </ContextMenuItem>
        ) : null}
        {onExpand ? <ContextMenuSeparator className="bg-border-subtle" /> : null}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
            <Copy className="size-4 text-muted-foreground" />
            Group
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="rounded-none border border-border-subtle bg-popover text-popover-foreground shadow-lg">
            <ContextMenuItem className="cursor-pointer text-sm">New group</ContextMenuItem>
            <ContextMenuItem className="cursor-pointer text-sm">Add to existing</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Terminal className="size-4 text-muted-foreground" />
          Copy SSH Command
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            Config
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="rounded-none border border-border-subtle bg-popover text-popover-foreground shadow-lg">
            <ContextMenuItem className="cursor-pointer text-sm">Environment Variables</ContextMenuItem>
            <ContextMenuItem className="cursor-pointer text-sm">Resource Limits</ContextMenuItem>
            <ContextMenuItem className="cursor-pointer text-sm">Networking</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator className="bg-border-subtle" />

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Zap className="size-4 text-muted-foreground" />
          Latest deploy
        </ContextMenuItem>

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Braces className="size-4 text-muted-foreground" />
          View Variables
        </ContextMenuItem>

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <BarChart2 className="size-4 text-muted-foreground" />
          View Metrics
        </ContextMenuItem>

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Settings className="size-4 text-muted-foreground" />
          View Settings
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-border-subtle" />

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Copy className="size-4 text-muted-foreground" />
          Duplicate
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-border-subtle" />

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-destructive focus:text-destructive">
          <Trash2 className="size-4" />
          Delete Service
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
