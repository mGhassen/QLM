import type { TabGroupColor } from '@qlm/ui/shell';

export type { TabGroupColor };

export type ShellTabStored = {
  id: string;
  title: string;
  href: string;
  pinned?: boolean;
  virtual?: boolean;
  groupId?: string;
};

export type ShellTabGroup = {
  id: string;
  title: string;
  color: TabGroupColor;
  collapsed: boolean;
  tabIds: string[];
};
