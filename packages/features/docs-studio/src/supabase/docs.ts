import type { SupabaseClient } from '@supabase/supabase-js';

import type { DocDocument, DocListItem, DocMeta, LoadedDoc } from '#/lib/types';
import { createDocsAdminClient } from '#/server/admin-client';

const BUCKET = 'docs';

function storagePath(slug: string, file: string) {
  return `${slug}/${file}`;
}

export async function getAllDocsFromSupabase(
  supabase: SupabaseClient,
): Promise<DocListItem[]> {
  const { data, error } = await supabase
    .from('doc_documents')
    .select('slug, title, updated_at')
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    slug: row.slug,
    title: row.title,
    updatedAt: row.updated_at,
  }));
}

export async function loadDocFromSupabase(
  slug: string,
  supabase: SupabaseClient,
): Promise<LoadedDoc | null> {
  const { data: row, error } = await supabase
    .from('doc_documents')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !row) return null;

  const prefix = row.storage_prefix as string;

  const { data: docFile, error: docError } = await supabase.storage
    .from(BUCKET)
    .download(storagePath(prefix, 'document.json'));

  if (docError || !docFile) return null;

  const document = JSON.parse(await docFile.text()) as DocDocument;

  const sections: Record<string, string> = {};
  const { data: sectionFiles } = await supabase.storage
    .from(BUCKET)
    .list(`${prefix}/sections`);

  if (sectionFiles) {
    for (const file of sectionFiles.filter((f) => f.name.endsWith('.md'))) {
      const { data: mdFile } = await supabase.storage
        .from(BUCKET)
        .download(storagePath(prefix, `sections/${file.name}`));
      if (mdFile) {
        sections[`sections/${file.name}`] = await mdFile.text();
      }
    }
  }

  const meta: DocMeta = {
    slug: row.slug,
    title: row.title,
    locale: row.locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return { meta, document, sections };
}

export async function saveDocToSupabase(
  slug: string,
  document: DocDocument,
  sections: Record<string, string>,
  meta?: Partial<DocMeta>,
): Promise<void> {
  const supabase = createDocsAdminClient();

  const { data: existing } = await supabase
    .from('doc_documents')
    .select('storage_prefix')
    .eq('slug', slug)
    .single();

  const prefix = existing?.storage_prefix ?? slug;

  const uploads: { path: string; body: string; contentType: string }[] = [
    {
      path: storagePath(prefix, 'document.json'),
      body: JSON.stringify(document, null, 2),
      contentType: 'application/json',
    },
  ];

  for (const [ref, content] of Object.entries(sections)) {
    const filename = ref.replace('sections/', '');
    uploads.push({
      path: storagePath(prefix, `sections/${filename}`),
      body: content,
      contentType: 'text/markdown',
    });
  }

  for (const upload of uploads) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(upload.path, upload.body, {
        contentType: upload.contentType,
        upsert: true,
      });
    if (error)
      throw new Error(
        `Storage upload failed (${upload.path}): ${error.message}`,
      );
  }

  const { error: updateError } = await supabase
    .from('doc_documents')
    .update({
      ...(meta?.title ? { title: meta.title } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug);

  if (updateError) throw new Error(`DB update failed: ${updateError.message}`);
}

export async function upsertDocRecord(
  slug: string,
  title: string,
  locale = 'fr',
): Promise<void> {
  const supabase = createDocsAdminClient();

  const { error } = await supabase.from('doc_documents').upsert(
    {
      slug,
      title,
      locale,
      storage_prefix: slug,
      published: false,
    },
    { onConflict: 'slug' },
  );

  if (error) throw new Error(`Failed to upsert doc record: ${error.message}`);
}

export async function deleteDocFromSupabase(slug: string): Promise<void> {
  const supabase = createDocsAdminClient();

  const { data: row } = await supabase
    .from('doc_documents')
    .select('storage_prefix')
    .eq('slug', slug)
    .single();

  const prefix = (row?.storage_prefix as string | undefined) ?? slug;

  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });
  if (files?.length) {
    const paths = files.map((f) => `${prefix}/${f.name}`);
    const { data: nested } = await supabase.storage
      .from(BUCKET)
      .list(`${prefix}/sections`, {
        limit: 1000,
      });
    if (nested?.length) {
      paths.push(...nested.map((f) => `${prefix}/sections/${f.name}`));
    }
    await supabase.storage.from(BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from('doc_documents')
    .delete()
    .eq('slug', slug);
  if (error) throw new Error(`Failed to delete doc record: ${error.message}`);
}

export async function uploadDocAssets(
  slug: string,
  files: { path: string; body: Buffer | string; contentType: string }[],
): Promise<void> {
  const supabase = createDocsAdminClient();

  for (const file of files) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${slug}/${file.path}`, file.body, {
        contentType: file.contentType,
        upsert: true,
      });
    if (error)
      throw new Error(`Asset upload failed (${file.path}): ${error.message}`);
  }
}
