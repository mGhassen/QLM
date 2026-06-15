export const SERVICE_RIGHT_PANEL_URL_TABS = [
  "overview",
  "logs",
  "schema",
  "variables",
  "settings",
] as const;

export type ServiceRightPanelUrlTab =
  (typeof SERVICE_RIGHT_PANEL_URL_TABS)[number];

const TAB_SET = new Set<string>(SERVICE_RIGHT_PANEL_URL_TABS);

/**
 * Parses the environments plugin path tail (after `/environment/` or `/environments/`).
 * `1` → canvas selection only; `1/overview` → selection + right panel tab.
 */
export function parseEnvironmentUrlPath(tail: string): {
  urlId: number | null;
  panelTab: ServiceRightPanelUrlTab | null;
} {
  const parts = tail.split("/").filter(Boolean);
  if (parts.length === 0) return { urlId: null, panelTab: null };
  const first = parts[0]!;
  if (!/^\d+$/.test(first)) return { urlId: null, panelTab: null };
  const urlId = Number(first);
  const second = parts[1];
  if (second != null && TAB_SET.has(second)) {
    return { urlId, panelTab: second as ServiceRightPanelUrlTab };
  }
  return { urlId, panelTab: null };
}

export function buildEnvironmentUrlPath(
  urlId: number,
  panelTab: ServiceRightPanelUrlTab | null,
): string {
  return panelTab ? `${urlId}/${panelTab}` : String(urlId);
}
