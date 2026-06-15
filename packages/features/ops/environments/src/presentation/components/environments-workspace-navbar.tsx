import { useState } from "react";
import { ChevronDown, Bell, Settings2, Zap } from "lucide-react";

import { cn } from "@qlm/ui/utils";
import { Separator } from "@qlm/ui/separator";

interface EnvironmentsWorkspaceNavbarProps {
  orgName: string;
  projectName: string;
  environments: string[];
  activeEnvironment: string;
  onEnvironmentChange: (env: string) => void;
  onOpenCmdk: () => void;
  onProjectSettings: () => void;
  onOrgSettings: () => void;
}

export function EnvironmentsWorkspaceNavbar({
  orgName,
  projectName,
  environments,
  activeEnvironment,
  onEnvironmentChange,
  onOpenCmdk,
  onProjectSettings,
  onOrgSettings,
}: EnvironmentsWorkspaceNavbarProps) {
  const [envDropdown, setEnvDropdown] = useState(false);
  const [orgDropdown, setOrgDropdown] = useState(false);

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          onClick={() => setOrgDropdown((v) => !v)}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {(orgName[0] ?? "?").toUpperCase()}
          </span>
          <span>{orgName}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
        {orgDropdown ? (
          <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-popover-border bg-popover py-1 shadow-lg">
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
              onClick={() => {
                setOrgDropdown(false);
                onOrgSettings();
              }}
            >
              Organization Settings
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
              onClick={() => {
                setOrgDropdown(false);
              }}
            >
              Switch Organization
            </button>
            <Separator className="my-1" />
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
              onClick={() => setOrgDropdown(false)}
            >
              New Organization
            </button>
          </div>
        ) : null}
      </div>

      <span className="text-muted-foreground/50">/</span>

      <span className="text-sm font-medium text-muted-foreground">{projectName}</span>

      <span className="text-muted-foreground/50">/</span>

      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          onClick={() => setEnvDropdown((v) => !v)}
        >
          <span>{activeEnvironment}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
        {envDropdown ? (
          <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-popover-border bg-popover py-1 shadow-lg">
            {environments.map((env) => (
              <button
                key={env}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-accent",
                  env === activeEnvironment ? "text-primary" : "text-muted-foreground",
                )}
                onClick={() => {
                  onEnvironmentChange(env);
                  setEnvDropdown(false);
                }}
              >
                <span>{env}</span>
                {env === activeEnvironment ? (
                  <span className="text-green-500">●</span>
                ) : null}
              </button>
            ))}
            <Separator className="my-1" />
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
              onClick={() => setEnvDropdown(false)}
            >
              + New Environment
            </button>
          </div>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          <Zap className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          className="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
        >
          <Bell className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onOpenCmdk}
          className="mx-1 flex items-center gap-2 rounded-md border border-popover-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          <span>Search...</span>
          <span className="ml-4 flex items-center gap-0.5 text-[10px]">
            <kbd className="rounded bg-accent px-1 py-0.5 text-[10px] text-muted-foreground">
              ⌘
            </kbd>
            <kbd className="rounded bg-accent px-1 py-0.5 text-[10px] text-muted-foreground">
              K
            </kbd>
          </span>
        </button>

        <button
          type="button"
          onClick={onProjectSettings}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>Settings</span>
        </button>

        <div className="ml-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          G
        </div>
      </div>
    </div>
  );
}
