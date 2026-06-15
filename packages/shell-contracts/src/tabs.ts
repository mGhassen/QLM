/** A tab in the project shell tab bar (store-level representation). */
export interface ShellTab {
  id: string;
  pluginId: string;
  displayName: string;
  routeBase: string;
  /** Deep path within the plugin (e.g. "environments/prod"). */
  path: string;
  pinned: boolean;
  createdAt: number;
}

/** Minimal tab item for the tab bar UI component. */
export interface WorkspaceTabBarItem {
  id: string;
  title: string;
  active?: boolean;
  pinned?: boolean;
}
