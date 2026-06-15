import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { decodeTabId, encodeTabId } from '@qlm/shell-contracts';
import { useShellApp } from '@qlm/shell-runtime';
import { createNewDocAction, deleteDocAction, importDocAction } from '@qlm/docs-studio/actions';
import type { DocListItem } from '@qlm/docs-studio';
import { docsPaths } from '@qlm/docs-studio/paths';
import {
  DocsPickerDialog,
  DocsStudioPage,
  DocsStudioRedirect,
  StudioShellProvider,
} from '@qlm/docs-studio/pages';

function studioDocTabId(slug: string): string {
  return encodeTabId({ kind: 'studio-doc', slug });
}

function readActiveSlug(search: Record<string, unknown>): string | undefined {
  const tid = typeof search.tid === 'string' ? search.tid : undefined;
  if (!tid) return undefined;
  const decoded = decodeTabId(tid);
  return decoded?.kind === 'studio-doc' ? decoded.slug : undefined;
}

function isDocsPickerOpen(search: Record<string, unknown>): boolean {
  return search.docsPicker === 1 || search.docsPicker === '1';
}

export default function StudioPluginRoot() {
  const { projectSlug, projectTabs } = useShellApp();
  const navigate = useNavigate();
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const slug = readActiveSlug(rawSearch);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: allDocs = [] } = useQuery({
    queryKey: ['doc-studio-list'],
    queryFn: async () => {
      const res = await fetch(docsPaths.api.list);
      if (!res.ok) throw new Error('Failed to list docs');
      return (await res.json()) as DocListItem[];
    },
  });

  const openDoc = useCallback(
    (nextSlug: string, title?: string) => {
      void navigate({
        to: '/prj/$projectSlug/studio',
        params: { projectSlug },
        search: (prev: Record<string, unknown>) => {
          const next: Record<string, unknown> = {
            ...prev,
            tid: studioDocTabId(nextSlug),
          };
          delete next.docsPicker;
          if (title) next.docTitle = title;
          return next;
        },
      });
    },
    [navigate, projectSlug],
  );

  const closeDocTab = useCallback(
    (tabSlug: string) => {
      projectTabs?.closeTab(studioDocTabId(tabSlug));
    },
    [projectTabs],
  );

  const syncDocTitle = useCallback(
    (title: string) => {
      if (!slug) return;
      void navigate({
        to: '/prj/$projectSlug/studio',
        params: { projectSlug },
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          tid: studioDocTabId(slug),
          docTitle: title,
        }),
        replace: true,
      });
    },
    [navigate, projectSlug, slug],
  );

  const openDocsPicker = useCallback(() => {
    setPickerOpen(true);
    void navigate({
      to: '/prj/$projectSlug/studio',
      params: { projectSlug },
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        docsPicker: 1,
      }),
    });
  }, [navigate, projectSlug]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    void navigate({
      to: '/prj/$projectSlug/studio',
      params: { projectSlug },
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        delete next.docsPicker;
        return next;
      },
      replace: true,
    });
  }, [navigate, projectSlug]);

  useEffect(() => {
    if (isDocsPickerOpen(rawSearch)) {
      setPickerOpen(true);
    }
  }, [rawSearch]);

  const shellValue = useMemo(
    () => ({
      projectSlug,
      activeSlug: slug,
      openDoc,
      closeDocTab,
      syncDocTitle,
      openDocsPicker,
    }),
    [projectSlug, slug, openDoc, closeDocTab, syncDocTitle, openDocsPicker],
  );

  return (
    <StudioShellProvider {...shellValue}>
      <div className="h-full min-h-0">
        {slug ? <DocsStudioPage slug={slug} /> : <DocsStudioRedirect />}
      </div>
      <DocsPickerDialog
        open={pickerOpen}
        onClose={closePicker}
        allDocs={allDocs}
        createNewDocAction={createNewDocAction}
        deleteDocAction={deleteDocAction}
        importDocAction={importDocAction}
      />
    </StudioShellProvider>
  );
}
