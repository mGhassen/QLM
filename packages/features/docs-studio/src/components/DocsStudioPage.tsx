import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { createNewDocAction, deleteDocAction, importDocAction } from '#/actions';
import { useStudioShell } from '#/studio-shell-context';
import DocStudio from '#/components/docs/studio/DocStudio';
import type { LoadedDoc } from '#/lib/types';
import { docsPaths } from '#/paths';

type DocsStudioPageProps = {
  slug: string;
};

export function DocsStudioPage({ slug }: DocsStudioPageProps) {
  const { syncDocTitle } = useStudioShell();

  const { data: doc, isPending, isError } = useQuery({
    queryKey: ['doc-studio', slug],
    queryFn: async () => {
      const res = await fetch(docsPaths.api.doc(slug));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to load doc');
      return (await res.json()) as LoadedDoc;
    },
  });

  useEffect(() => {
    if (doc?.meta.title) syncDocTitle(doc.meta.title);
  }, [doc?.meta.title, syncDocTitle]);

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Document not found
      </div>
    );
  }

  return (
    <DocStudio
      key={slug}
      slug={slug}
      initialDoc={doc}
      createNewDocAction={createNewDocAction}
      deleteDocAction={deleteDocAction}
      importDocAction={importDocAction}
    />
  );
}
