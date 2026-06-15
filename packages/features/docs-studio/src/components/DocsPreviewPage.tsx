import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import DocLayout from '#/components/docs/DocLayout';
import type { LoadedDoc } from '#/lib/types';
import { themeToStyle } from '#/lib/theme';
import { docsPaths } from '#/paths';

type DocsPreviewPageProps = {
  slug: string;
};

export function DocsPreviewPage({ slug }: DocsPreviewPageProps) {
  const { data: doc, isPending, isError } = useQuery({
    queryKey: ['doc-preview', slug],
    queryFn: async () => {
      const res = await fetch(docsPaths.api.preview(slug));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to load doc');
      return (await res.json()) as LoadedDoc;
    },
  });

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Document not found
      </div>
    );
  }

  return (
    <DocLayout
      title={doc.meta.title}
      layoutMode={doc.document.layoutMode ?? 'paginated'}
      pageFormat={doc.document.pageFormat ?? 'a4'}
      pageSetup={doc.document.pageSetup}
      chrome={doc.document.chrome}
      themeStyle={themeToStyle(doc.document.theme ?? {})}
      blocks={doc.document.blocks}
      body={doc.document.body}
      flowDocument={doc.document}
      sections={doc.sections}
    />
  );
}
