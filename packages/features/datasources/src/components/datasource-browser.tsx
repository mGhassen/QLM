import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { ArrowLeft, ArrowRight, Database, Sparkles, X } from 'lucide-react';

import type { DatasourceExtension } from '@qlm/extensions-sdk';
import { Button } from '@qlm/ui/button';
import { Input } from '@qlm/ui/input';
import { cn } from '@qlm/ui/utils';

const ITEMS_PER_PAGE = 24;
const FILTER_TAGS = ['SQL', 'Files', 'SaaS', 'API'] as const;

export interface DatasourceBrowserProps {
  /** All available datasource extensions (from `ExtensionsRegistry.list('datasource')`). */
  extensions: DatasourceExtension[];
  /** Called when the user picks an extension to connect. */
  onSelect: (extension: DatasourceExtension) => void;
  /** Called when the user dismisses the browser (back / close button). */
  onBack?: () => void;
}

/**
 * Grid of available datasource types with search and tag filters.
 * Pure presentation: the consumer decides what to do on select
 * (typically opening a connect sheet).
 */
export function DatasourceBrowser({
  extensions,
  onSelect,
  onBack,
}: Readonly<DatasourceBrowserProps>) {
  const { t } = useTranslation('datasources');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());

  // Focus shortcut: ⌘F / Ctrl+F opens the search box.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'f' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setShouldAnimate(true);
        searchInputRef.current?.focus();
        setTimeout(() => setShouldAnimate(false), 1000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFilter = (tag: string) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const filtered = useMemo(() => {
    return extensions.filter((ext) => {
      const matchesSearch =
        searchQuery === '' ||
        ext.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        selectedFilters.size === 0 ||
        ext.tags?.some((tag) => selectedFilters.has(tag));
      return matchesSearch && matchesFilter;
    });
  }, [extensions, searchQuery, selectedFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleLogoError = (id: string) => {
    setFailedLogos((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/40 bg-background/95 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="px-8 py-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  aria-label={t('back', { defaultValue: 'Back' })}
                  className="text-muted-foreground hover:text-foreground mt-1 h-8 w-8 shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1">
                <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                  {t('new_pageTitle', { name: '' })}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('new_pageSubtitle')}
                </p>
              </div>
            </div>

            <div
              className={cn(
                'bg-muted/30 border-border/50 focus-within:border-border flex h-12 w-full items-center gap-3 rounded-xl border px-4 transition-all focus-within:bg-transparent',
                shouldAnimate && 'ring-ring ring-2 ring-offset-2',
              )}
            >
              <MagnifyingGlassIcon className="text-muted-foreground/60 h-5 w-5 shrink-0" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={t('browserSearchPlaceholder', {
                  defaultValue: 'Search datasources...',
                })}
                className="h-full flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label={t('clearSearch', {
                    defaultValue: 'Clear search',
                  })}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-full p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="bg-border/50 mx-2 h-6 w-px" />
              <div className="flex items-center gap-2">
                {FILTER_TAGS.map((tag) => {
                  const isSelected = selectedFilters.has(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleFilter(tag)}
                      className={cn(
                        'relative cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-all duration-200',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-muted/30 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
              <Database className="text-muted-foreground/50 h-8 w-8" />
            </div>
            <h3 className="text-foreground mb-2 text-lg font-medium">
              {t('browserEmptyTitle', {
                defaultValue: 'No datasources found',
              })}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm">
              {t('browserEmptyDescription', {
                defaultValue:
                  'Try adjusting your filters or search query, or request a new datasource type.',
              })}
            </p>
            <a
              href="https://github.com/qlm/qlm-console-v3/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 inline-flex cursor-pointer items-center gap-2 text-sm font-medium transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {t('requestDatasource', {
                defaultValue: 'Request a new datasource',
              })}
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {paginated.map((ext) => {
                const hasFailed = failedLogos.has(ext.id);
                const showLogo = ext.icon && !hasFailed;
                const shouldInvert = ext.id.toLowerCase().includes('json');
                return (
                  <button
                    key={ext.id}
                    type="button"
                    onClick={() => onSelect(ext)}
                    className="group hover:bg-accent/30 relative flex w-full cursor-pointer flex-col items-center rounded-xl p-5 text-left transition-all duration-200"
                  >
                    <div className="bg-muted/40 group-hover:bg-muted/60 mb-4 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-200 group-hover:scale-105">
                      {showLogo ? (
                        <img
                          src={ext.icon}
                          alt={ext.name}
                          className={cn(
                            'h-12 w-12 object-contain',
                            shouldInvert && 'dark:invert',
                          )}
                          onError={() => handleLogoError(ext.id)}
                        />
                      ) : (
                        <Database className="text-muted-foreground/60 h-9 w-9" />
                      )}
                    </div>
                    <span className="text-foreground text-center text-base leading-tight font-medium">
                      {ext.name}
                    </span>
                    <div className="text-muted-foreground/0 group-hover:text-muted-foreground/60 mt-1.5 flex items-center gap-1 text-xs transition-all duration-200">
                      <span>{t('connect', { defaultValue: 'Connect' })}</span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="border-border/40 mt-8 flex items-center justify-center border-t pt-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToPage(effectivePage - 1)}
                    disabled={effectivePage === 1}
                    className="h-9 gap-1 px-3"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t('previous', { defaultValue: 'Previous' })}
                    </span>
                  </Button>
                  <div className="text-muted-foreground px-3 text-sm">
                    {effectivePage} / {totalPages}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToPage(effectivePage + 1)}
                    disabled={effectivePage === totalPages}
                    className="h-9 gap-1 px-3"
                  >
                    <span className="hidden sm:inline">
                      {t('next', { defaultValue: 'Next' })}
                    </span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
