"use client";

import { ListTree, Plus, Settings } from "lucide-react";
import { cn } from "@guepard/ui/utils";

export type StudioLeftPanel = "add" | "outline" | null;

interface StudioLeftRailProps {
  active: StudioLeftPanel;
  onChange: (panel: StudioLeftPanel) => void;
  onOpenSettings: () => void;
}

const RAIL_ITEMS: {
  id: Exclude<StudioLeftPanel, null>;
  icon: typeof Plus;
  label: string;
}[] = [
  { id: "add", icon: Plus, label: "Insert" },
  { id: "outline", icon: ListTree, label: "Outline" },
];

function railButtonClass(active: boolean) {
  return cn(
    "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );
}

export default function StudioLeftRail({ active, onChange, onOpenSettings }: StudioLeftRailProps) {
  return (
    <nav
      data-studio-chrome
      className="bg-sidebar border-sidebar-border flex w-10 shrink-0 flex-col items-center gap-0.5 border-r py-2"
      aria-label="Studio tools"
    >
      {RAIL_ITEMS.map(({ id, icon: Icon, label }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(selected ? null : id)}
            className={railButtonClass(selected)}
            title={label}
            aria-label={label}
            aria-pressed={selected}
          >
            <Icon size={16} strokeWidth={1.75} />
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onOpenSettings}
        className={railButtonClass(false)}
        title="Document settings"
        aria-label="Document settings"
      >
        <Settings size={16} strokeWidth={1.75} />
      </button>
    </nav>
  );
}
