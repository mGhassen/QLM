import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import type { DocListItem } from '#/lib/types';
import { docsPaths } from '#/paths';
import { useStudioShell } from '#/studio-shell-context';

export function DocsStudioRedirect() {
  const { openDoc } = useStudioShell();

  useEffect(() => {
    void (async () => {
      let res = await fetch(docsPaths.api.list);
      if (!res.ok) return;

      let docs = (await res.json()) as DocListItem[];

      if (docs.length === 0) {
        res = await fetch(docsPaths.api.list, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Doc' }),
        });
        if (!res.ok) return;
        const created = (await res.json()) as { slug: string };
        openDoc(created.slug, 'New Doc');
        return;
      }

      const first = docs[0]!;
      openDoc(first.slug, first.title);
    })();
  }, [openDoc]);

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  );
}
