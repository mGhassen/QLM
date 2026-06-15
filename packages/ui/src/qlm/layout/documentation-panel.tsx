import { type ReactNode } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * View-contextual documentation panel.
 *
 * The panel body is whatever the currently-mounted plugin has asked the
 * shell to surface via `useDocsPanel().open(pageId)` — the host resolves
 * the id to a React component through the app registry and passes it in
 * as `page`. When no page is selected, a short placeholder prompts the
 * user to pick a feature first.
 */
export type DocumentationPanelProps = {
  page: ReactNode | null;
};

export function DocumentationPanel({
  page,
}: Readonly<DocumentationPanelProps>) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <BookOpen className="text-primary h-5 w-5" />
        <div>
          <h2 className="text-sm font-semibold">Documentation</h2>
          <p className="text-muted-foreground text-xs">
            Contextual help for the current view
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {page !== null ? (
          page
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-muted-foreground text-xs">
              Select a feature on the left to see contextual help here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
