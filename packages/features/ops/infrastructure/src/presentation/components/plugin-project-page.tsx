import { useSearch } from '@tanstack/react-router';

import { useShell } from '@qlm/shell-runtime';

import { InfrastructureActivitySection } from './infrastructure-activity-section';
import { InfrastructureReplicasSection } from './infrastructure-replicas-section';
import { InfrastructureSettingsTab } from './infrastructure-settings-tab';
import { ListPage } from './list-page';

type View = 'state' | 'activity' | 'settings';

function parseView(raw: unknown): View {
  if (raw === 'activity' || raw === 'settings') return raw;
  return 'state';
}

/**
 * Top-level Infrastructure page. Switches between three sub-views via
 * the `view` URL search param:
 *
 *   - `view=state` (default) → nodes list (CRUD + inspection)
 *   - `view=activity`        → fleet activity charts (project-wide)
 *   - `view=settings`        → settings + replicas (project-wide)
 *
 * RFC 0025 phase 1 keeps replicas embedded under Settings rather than
 * extracting to a standalone app — that promotion lives in RFC 0029.
 */
export function PluginProjectPage() {
  const shell = useShell();
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const view = parseView(rawSearch.view);

  if (view === 'activity') {
    return (
      <InfrastructureActivitySection
        projectId={shell.projectId}
        computeTier="nano"
      />
    );
  }
  if (view === 'settings') {
    return (
      <div className="flex flex-col gap-8 p-6">
        <InfrastructureSettingsTab projectId={shell.projectId} />
        <InfrastructureReplicasSection />
      </div>
    );
  }
  return <ListPage projectId={shell.projectId} />;
}
