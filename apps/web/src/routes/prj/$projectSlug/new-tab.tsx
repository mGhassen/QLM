import { useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Plus } from 'lucide-react';

import { renderIcon } from '@guepard/ui/shell';
import { cn } from '@guepard/ui/utils';

import { getAppRegistry } from '@/shell/app-registry';
import {
  ProjectShellHost,
  useProjectShellContextBySlug,
  type VirtualTab,
} from '@/shell/project-shell-host';
import { useTabStateContext } from '@/shell/tab-state';
import { useDocumentTitle } from '@/lib/use-document-title';

export const Route = createFileRoute('/prj/$projectSlug/new-tab')({
  component: NewTabRoute,
});

const registry = getAppRegistry();

function NewTabRoute() {
  const { projectSlug } = Route.useParams();
  const { organization, project, isLoading } =
    useProjectShellContextBySlug(projectSlug);
  useDocumentTitle('New Tab');

  if (isLoading || !organization || !project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const virtualTab: VirtualTab = {
    id: 'new-tab',
    title: 'New Tab',
    href: `/prj/${projectSlug}/new-tab`,
  };

  return (
    <ProjectShellHost
      orgSlug={organization.slug}
      projectSlug={projectSlug}
      organization={organization}
      project={project}
      activeTabId="new-tab"
      virtualTab={virtualTab}
    >
      <NewTabPage projectSlug={projectSlug} />
    </ProjectShellHost>
  );
}

type FlatItem = {
  id: string;
  label: string;
  icon?: string;
  section: string;
  description?: string;
};

function NewTabPage({
  projectSlug: _projectSlug,
}: {
  readonly projectSlug: string;
}) {
  const { t } = useTranslation('shell');
  const ctx = useTabStateContext();
  const [query, setQuery] = useState('');

  const pinnedItems = useMemo(() => registry.getPinnedItems(), []);
  const navGroups = useMemo(() => registry.getNavGroups(), []);
  const openInBackgroundLabel = t('newTab.openInBackground');

  // Search: flat list across all sections
  const searchResults = useMemo<FlatItem[] | null>(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const results: FlatItem[] = [];
    for (const item of pinnedItems) {
      if (item.label.toLowerCase().includes(q)) {
        results.push({
          id: item.id,
          label: item.label,
          icon: item.icon,
          section: t('newTab.pinnedSection'),
        });
      }
    }
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.label.toLowerCase().includes(q)) {
          const entry = registry.getByRouteBase(item.id);
          results.push({
            id: item.id,
            label: item.label,
            icon: item.icon,
            section: group.title,
            description: entry?.manifest.description,
          });
        }
      }
    }
    return results;
  }, [pinnedItems, navGroups, query, t]);

  function handleOpen(routeBase: string) {
    const entry = registry.getByRouteBase(routeBase);
    if (entry) ctx.replaceNewTab(entry.manifest.routeBase);
  }

  function handleOpenBackground(routeBase: string) {
    const entry = registry.getByRouteBase(routeBase);
    if (entry) ctx.openInBackground(entry.manifest.routeBase);
  }

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Search — centered hero */}
      <div className="flex flex-col items-center px-8 pt-14 pb-8">
        <div className="group relative w-full max-w-2xl">
          <Search className="text-muted-foreground/50 group-focus-within:text-primary pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('newTab.searchPlaceholder')}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="border-border bg-muted/20 focus:border-primary focus:bg-background h-11 w-full border pr-4 pl-11 text-[15px] font-bold tracking-tight shadow-sm transition-all focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl py-3">
          {searchResults ? (
            /* Flat search results */
            searchResults.length > 0 ? (
              searchResults.map((item) => (
                <AppRow
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  badge={item.section}
                  onClick={() => handleOpen(item.id)}
                  onOpenInBackground={() => handleOpenBackground(item.id)}
                  openInBackgroundLabel={openInBackgroundLabel}
                />
              ))
            ) : (
              <div className="flex flex-col items-center gap-4 px-4 py-10">
                <div className="text-muted-foreground flex items-center gap-3">
                  <Search className="h-4 w-4 shrink-0" />
                  <p className="text-sm font-semibold">
                    {t('newTab.noResults')}
                  </p>
                </div>
              </div>
            )
          ) : (
            /* Grouped view */
            <>
              {pinnedItems.length > 0 && (
                <section>
                  <SectionLabel title={t('newTab.pinnedSection')} />
                  {pinnedItems.map((item) => (
                    <AppRow
                      key={item.id}
                      label={item.label}
                      icon={item.icon}
                      onClick={() => handleOpen(item.id)}
                      onOpenInBackground={() => handleOpenBackground(item.id)}
                      openInBackgroundLabel={openInBackgroundLabel}
                    />
                  ))}
                </section>
              )}
              {navGroups.map((group) => (
                <section key={group.title}>
                  <SectionLabel title={group.title} />
                  {group.items.map((item) => {
                    const entry = registry.getByRouteBase(item.id);
                    return (
                      <AppRow
                        key={item.id}
                        label={item.label}
                        icon={item.icon}
                        badge={entry?.manifest.description}
                        onClick={() => handleOpen(item.id)}
                        onOpenInBackground={() => handleOpenBackground(item.id)}
                        openInBackgroundLabel={openInBackgroundLabel}
                      />
                    );
                  })}
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ title }: { readonly title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-muted-foreground/60 text-[11px] font-bold tracking-tight">
        {title}
      </p>
    </div>
  );
}

function AppRow({
  label,
  icon,
  badge,
  onClick,
  onOpenInBackground,
  openInBackgroundLabel,
}: {
  readonly label: string;
  readonly icon?: string;
  readonly badge?: string;
  readonly onClick: () => void;
  readonly onOpenInBackground?: () => void;
  readonly openInBackgroundLabel?: string;
}) {
  const iconElement = renderIcon(icon, {
    className: 'text-foreground/70 h-3.5 w-3.5',
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 px-4 py-2',
        'hover:bg-muted/50 transition-colors duration-100',
        'focus-visible:bg-muted/50 focus-visible:outline-none',
      )}
    >
      {/* Icon tile */}
      <div className="border-border bg-muted/60 group-hover:border-foreground/30 flex h-6 w-6 shrink-0 items-center justify-center border transition-colors">
        {iconElement ?? (
          <span className="text-foreground/50 text-[9px] font-black uppercase">
            {label.slice(0, 2)}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="text-foreground flex-1 truncate text-left text-[13px] font-bold tracking-tight">
        {label}
      </span>

      {/* Badge (section in search mode, or description in grouped mode) */}
      {badge && (
        <span className="text-muted-foreground/50 max-w-[180px] shrink-0 truncate text-[10px] font-bold tracking-tight">
          {badge}
        </span>
      )}

      {/* Open in background */}
      {onOpenInBackground && (
        <button
          type="button"
          title={openInBackgroundLabel}
          onClick={(e) => {
            e.stopPropagation();
            onOpenInBackground();
          }}
          className={cn(
            'border-border bg-muted flex h-5 w-5 shrink-0 items-center justify-center border',
            'opacity-0 transition-opacity duration-100 group-hover:opacity-100',
            'hover:bg-foreground hover:text-background hover:border-foreground cursor-pointer',
          )}
        >
          <Plus className="h-2.5 w-2.5" />
        </button>
      )}
    </button>
  );
}
