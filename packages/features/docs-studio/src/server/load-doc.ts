import type { SupabaseClient } from '@supabase/supabase-js';

import { prepareStudioDocument } from '#/lib/studio-document';
import {
  getAllDocsFromSupabase,
  loadDocFromSupabase,
} from '#/supabase/docs';
import { getSupabaseServerClient } from '@guepard/supabase/server-client';

export function getDocsSupabase(request: Request) {
  return getSupabaseServerClient(request);
}

export async function listDocsForRequest(request: Request) {
  const { client } = getDocsSupabase(request);
  return getAllDocsFromSupabase(client);
}

export async function loadDocForRequest(request: Request, slug: string) {
  const { client } = getDocsSupabase(request);
  const doc = await loadDocFromSupabase(slug, client);
  if (!doc) return null;

  return {
    ...doc,
    document: prepareStudioDocument(doc.document, doc.sections),
  };
}

export async function loadDocWithClient(slug: string, client: SupabaseClient) {
  const doc = await loadDocFromSupabase(slug, client);
  if (!doc) return null;

  return {
    ...doc,
    document: prepareStudioDocument(doc.document, doc.sections),
  };
}
