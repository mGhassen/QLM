import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, LayoutGrid, Pin } from 'lucide-react';

import type { SidebarAppGroup } from '@guepard/ui/shell';
import { resolveIcon, useShellSidebar } from '@guepard/ui/shell';
import { cn } from '@guepard/ui/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@guepard/ui/dialog';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@guepard/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@guepard/ui/tabs';

export type AppsPickerMenuProps = {
  appGroups: SidebarAppGroup[];
  pinnedIds: ReadonlySet<string> | string[];
  onTogglePin: (appId: string) => void;
  onOpenApp: (appId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When false, only the dialog is rendered (opened via org menu). Default true. */
  showTrigger?: boolean;
};

function usePinnedSet(pinnedIds: ReadonlySet<string> | string[]) {
  return useMemo(
    () => (pinnedIds instanceof Set ? pinnedIds : new Set(pinnedIds)),
    [pinnedIds],
  );
}

function useAppPickerGroups(appGroups: SidebarAppGroup[]) {
  return useMemo(
    () => appGroups.filter((group) => group.items.length > 0),
    [appGroups],
  );
}

function AppsPickerDialogBody({
  appGroups,
  pinnedIds,
  onTogglePin,
  onOpenApp,
  onClose,
}: AppsPickerMenuProps & { onClose: () => void }) {
  const { t } = useTranslation('shell');
  const pinnedSet = usePinnedSet(pinnedIds);
  const groups = useAppPickerGroups(appGroups);
  const defaultTab = groups[0]?.title ?? '';

  return (
    <>
      <DialogHeader className="border-border space-y-1 border-b px-4 py-3 text-left">
        <DialogTitle className="text-sm font-semibold">
          {t('appsPicker.title')}
        </DialogTitle>
        <DialogDescription className="text-xs">
          {t('appsPicker.subtitle')}
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b bg-transparent p-0">
          {groups.map((group) => (
            <TabsTrigger
              key={group.title}
              value={group.title}
              className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-3 py-2 text-xs"
            >
              {group.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map((group) => (
          <TabsContent
            key={group.title}
            value={group.title}
            className="mt-0 max-h-[50vh] overflow-y-auto p-1"
          >
            {group.items.map((item) => {
              const Icon = resolveIcon(item.icon);
              const pinned = pinnedSet.has(item.id);

              return (
                <div
                  key={item.id}
                  className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onOpenApp(item.id);
                      onClose();
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTogglePin(item.id)}
                    className={cn(
                      'text-muted-foreground hover:text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                      pinned && 'text-foreground',
                    )}
                    aria-label={
                      pinned
                        ? t('appsPicker.unpin', { app: item.label })
                        : t('appsPicker.pin', { app: item.label })
                    }
                  >
                    {pinned ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

/** Single org-menu entry (collapsed sidebar) — opens the apps dialog. */
export function AppsPickerCollapsedMenuItem({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation('shell');

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          onOpen();
        }}
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        {t('appsPicker.title')}
      </DropdownMenuItem>
    </>
  );
}

export function AppsPickerMenu({
  appGroups,
  pinnedIds,
  onTogglePin,
  onOpenApp,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: AppsPickerMenuProps) {
  const { t } = useTranslation('shell');
  const { collapsed } = useShellSidebar();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const groups = useAppPickerGroups(appGroups);

  if (groups.length === 0) {
    return null;
  }

  const showSidebarTrigger = showTrigger && !collapsed;

  return (
    <>
      {showSidebarTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
          aria-label={t('appsPicker.triggerAria')}
          title={t('appsPicker.triggerTitle')}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 rounded-none p-0 sm:max-w-md">
          <AppsPickerDialogBody
            appGroups={appGroups}
            pinnedIds={pinnedIds}
            onTogglePin={onTogglePin}
            onOpenApp={onOpenApp}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
