import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CircleStop,
  Droplets,
  Eye,
  LayoutGrid,
  List,
  Play,
  Plus,
  Server,
} from 'lucide-react';

import type {
  Node,
  NodeLifecycleState,
  NodeProvider,
} from '@guepard/domain/entities';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@guepard/ui/command';

export type CommandPaletteProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: Node[];
  /** Jump to a node's details sheet by id. */
  onOpenNode: (id: string) => void;
  /** Toggle a lifecycle filter in URL state. */
  onToggleLifecycle: (lifecycle: NodeLifecycleState) => void;
  /** Toggle a provider filter in URL state. */
  onToggleProvider: (provider: NodeProvider) => void;
  /** Switch list / grid display modes. */
  onSetDisplayMode: (mode: 'list' | 'grid') => void;
  /** Open the create-node sheet. */
  onCreate: () => void;
}>;

/**
 * Feature-local ⌘K palette. Registers a window-level keydown listener
 * that flips `open` on Cmd/Ctrl+K when the caller wires its setter.
 * All commands dispatch through caller-provided handlers — the palette
 * itself owns no mutation state.
 */
export function CommandPalette({
  open,
  onOpenChange,
  rows,
  onOpenNode,
  onToggleLifecycle,
  onToggleProvider,
  onSetDisplayMode,
  onCreate,
}: CommandPaletteProps) {
  const { t } = useTranslation('nodes');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Cap node list to avoid rendering thousands of CommandItems — cmdk
  // already fuzzy-filters so the cap is cosmetic (hide the rest until
  // the user types a query that narrows the match).
  const nodeItems = useMemo(() => rows.slice(0, 50), [rows]);

  const close = () => onOpenChange(false);

  const itemClass =
    'gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-tight rounded-none cursor-pointer data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground transition-all';
  const groupClass =
    '[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/60 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-4 [&_[cmdk-group-heading]]:pb-2';

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="rounded-none sm:rounded-none border border-border bg-background max-w-xl p-0 pt-0 gap-0 shadow-2xl"
      commandClassName="rounded-none"
    >
      <CommandInput
        placeholder={t('placeholder')}
        className="h-12 border-0 text-[13px] font-bold tracking-tight placeholder:text-muted-foreground/40"
      />
      <CommandList className="max-h-[60vh] border-t border-border">
        <CommandEmpty className="py-10 text-center text-[11px] font-bold uppercase tracking-tight text-muted-foreground/50">
          {t('palette.empty')}
        </CommandEmpty>

        <CommandGroup heading={t('actionsHeading')} className={groupClass}>
          <CommandItem
            className={itemClass}
            value={`/action /actions ${t('create')}`}
            onSelect={() => {
              onCreate();
              close();
            }}
          >
            <Plus className="h-4 w-4 opacity-70" />
            <span>{t('create')}</span>
          </CommandItem>
          <CommandItem
            className={itemClass}
            value={`/action /actions ${t('viewList')}`}
            onSelect={() => {
              onSetDisplayMode('list');
              close();
            }}
          >
            <List className="h-4 w-4 opacity-70" />
            <span>{t('viewList')}</span>
          </CommandItem>
          <CommandItem
            className={itemClass}
            value={`/action /actions ${t('viewGrid')}`}
            onSelect={() => {
              onSetDisplayMode('grid');
              close();
            }}
          >
            <LayoutGrid className="h-4 w-4 opacity-70" />
            <span>{t('viewGrid')}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="h-px bg-border" />

        <CommandGroup heading={t('filterLifecycleHeading')} className={groupClass}>
          {(
            [
              'active',
              'provisioning',
              'stopping',
              'stopped',
              'terminating',
              'terminated',
            ] as NodeLifecycleState[]
          ).map((s) => (
            <CommandItem
              key={s}
              className={itemClass}
              value={`/lifecycle /lifecycles ${t(`lifecycle.${s}`)}`}
              onSelect={() => {
                onToggleLifecycle(s);
                close();
              }}
            >
              {s === 'active' && <Play className="h-4 w-4 opacity-70" />}
              {(s === 'stopping' || s === 'terminating') && (
                <Droplets className="h-4 w-4 opacity-70" />
              )}
              {(s === 'stopped' || s === 'terminated') && (
                <CircleStop className="h-4 w-4 opacity-70" />
              )}
              {s === 'provisioning' && <Server className="h-4 w-4 opacity-70" />}
              <span>{t(`lifecycle.${s}`)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator className="h-px bg-border" />

        <CommandGroup heading={t('filterProviderHeading')} className={groupClass}>
          {(['aws', 'gcp', 'azure', 'on-premise'] as NodeProvider[]).map(
            (p) => (
              <CommandItem
                key={p}
                className={itemClass}
                value={`/provider /providers ${t(`provider.${p}`)}`}
                onSelect={() => {
                  onToggleProvider(p);
                  close();
                }}
              >
                <Server className="h-4 w-4 opacity-70" />
                <span>{t(`provider.${p}`)}</span>
              </CommandItem>
            ),
          )}
        </CommandGroup>

        <CommandSeparator className="h-px bg-border" />

        <CommandGroup heading={t('jumpHeading')} className={groupClass}>
          {nodeItems.map((node) => (
            <CommandItem
              key={node.id}
              value={`/node /nodes /jump ${node.name} ${node.id}`}
              className={itemClass}
              onSelect={() => {
                onOpenNode(node.id);
                close();
              }}
            >
              <Eye className="h-4 w-4 opacity-70" />
              <span className="uppercase">{node.name}</span>
              <span className="ml-auto font-mono text-[10px] tracking-normal normal-case opacity-60">
                {node.id}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
