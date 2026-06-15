import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Settings, Table2, Workflow } from 'lucide-react';

import { cn } from '@qlm/ui/utils';

export type DatasourceDetailSection = 'schema' | 'tables' | 'settings';

export interface DatasourceDetailSidebarProps {
  datasourceName: string;
  providerIcon?: string;
  activeSection: DatasourceDetailSection;
  onSectionChange: (section: DatasourceDetailSection) => void;
}

/**
 * Left-hand navigation for the datasource detail view.
 * Renders the datasource name/icon and a short list of sections
 * (schema / tables / settings). Parent owns the active state and
 * handles navigation.
 */
export function DatasourceDetailSidebar({
  datasourceName,
  providerIcon,
  activeSection,
  onSectionChange,
}: Readonly<DatasourceDetailSidebarProps>) {
  const { t } = useTranslation('datasources');

  const items: Array<{
    id: DatasourceDetailSection;
    label: string;
    icon: ReactNode;
  }> = [
    {
      id: 'schema',
      label: t('detail.schema', { defaultValue: 'Schema' }),
      icon: <Workflow className="h-4 w-4" />,
    },
    {
      id: 'tables',
      label: t('detail.tables', { defaultValue: 'Tables' }),
      icon: <Table2 className="h-4 w-4" />,
    },
    {
      id: 'settings',
      label: t('detail.settings', { defaultValue: 'Settings' }),
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  return (
    <aside className="bg-background flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex items-center gap-3 p-4">
        <div className="bg-muted/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          {providerIcon ? (
            <img
              src={providerIcon}
              alt={datasourceName}
              className="h-7 w-7 object-contain"
            />
          ) : (
            <Database className="text-muted-foreground h-5 w-5" />
          )}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {datasourceName}
        </span>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {items.map((item) => {
          const isActive = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
