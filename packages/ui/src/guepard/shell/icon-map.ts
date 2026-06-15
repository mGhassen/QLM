import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  SquareTerminal,
  Database,
  ArrowRightLeft,
  Gauge,
  ShieldCheck,
  TableProperties,
  Sparkles,
  Package,
  Settings,
  Server,
  Link,
  FolderOpen,
  BookOpen,
  ListTodo,
  Brain,
  Bot,
  Wrench,
  Terminal,
  FileText,
  BarChart3,
  Globe,
  Blocks,
  GitBranch,
  Workflow,
  Notebook,
  Cpu,
  Activity,
  Search,
  MessageSquare,
  Lightbulb,
  Network,
  CircuitBoard,
  Plug,
  Boxes,
  HardDrive,
} from 'lucide-react';

/** Maps string icon names (from shell-contracts) to Lucide React components. */
export const SHELL_ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  SquareTerminal,
  Database,
  ArrowRightLeft,
  Gauge,
  ShieldCheck,
  TableProperties,
  Sparkles,
  Package,
  Settings,
  Server,
  Link,
  FolderOpen,
  BookOpen,
  ListTodo,
  Brain,
  Bot,
  Wrench,
  Terminal,
  FileText,
  BarChart3,
  Globe,
  Blocks,
  GitBranch,
  Workflow,
  Notebook,
  Cpu,
  Activity,
  Search,
  MessageSquare,
  Lightbulb,
  Network,
  CircuitBoard,
  Plug,
  Boxes,
  HardDrive,
};

export function resolveIcon(name: string): LucideIcon | undefined {
  return SHELL_ICON_MAP[name];
}

export function renderIcon(
  name: string | undefined,
  props?: React.ComponentProps<LucideIcon>,
): React.ReactElement | null {
  if (!name) return null;
  const Icon = SHELL_ICON_MAP[name];
  if (!Icon) return null;
  return React.createElement(Icon, props);
}
