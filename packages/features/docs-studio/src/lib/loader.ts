import fs from 'fs';
import path from 'path';
import type { DocDocument, DocListItem, DocMeta, LoadedDoc } from './types';
import { createDefaultDocument } from './default-document';
import { resolveImportAssetPaths, type ImportResult } from './import';
import { prepareStudioDocument } from './studio-document';
import {
  deleteDocFromSupabase,
  getAllDocsFromSupabase,
  loadDocFromSupabase,
  saveDocToSupabase,
  uploadDocAssets,
  upsertDocRecord,
} from '#/supabase/docs';
import { createDocsAdminClient } from '#/server/admin-client';

export { resolveBlockContent } from './content';

const DOCS_DIR = path.join(process.cwd(), 'content', 'docs');

function docDir(slug: string) {
  return path.join(DOCS_DIR, slug);
}

function hasSupabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLIC_KEY;
  return !!(url && key);
}

function adminClientForLoader() {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  try {
    return createDocsAdminClient();
  } catch {
    return null;
  }
}

function getAllDocsFromFilesystem(): DocListItem[] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs
    .readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        fs.existsSync(path.join(DOCS_DIR, d.name, 'meta.json')),
    )
    .map((d) => {
      const meta = JSON.parse(
        fs.readFileSync(path.join(DOCS_DIR, d.name, 'meta.json'), 'utf-8'),
      ) as DocMeta;
      return {
        slug: meta.slug,
        title: meta.title,
        updatedAt: meta.updatedAt ?? meta.createdAt,
      };
    });
}

function loadDocFromFilesystem(slug: string): LoadedDoc | null {
  const dir = docDir(slug);
  const metaPath = path.join(dir, 'meta.json');
  const docPath = path.join(dir, 'document.json');

  if (!fs.existsSync(metaPath) || !fs.existsSync(docPath)) return null;

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as DocMeta;
  const rawDocument = JSON.parse(
    fs.readFileSync(docPath, 'utf-8'),
  ) as DocDocument;

  const sections: Record<string, string> = {};
  const sectionsDir = path.join(dir, 'sections');
  if (fs.existsSync(sectionsDir)) {
    for (const file of fs
      .readdirSync(sectionsDir)
      .filter((f) => f.endsWith('.md'))) {
      sections[`sections/${file}`] = fs.readFileSync(
        path.join(sectionsDir, file),
        'utf-8',
      );
    }
  }

  const document = prepareStudioDocument(rawDocument, sections);

  return { meta, document, sections };
}

export async function getAllDocs(): Promise<DocListItem[]> {
  const admin = adminClientForLoader();
  if (admin) {
    const docs = await getAllDocsFromSupabase(admin);
    if (docs.length > 0) return docs;
  }
  return getAllDocsFromFilesystem();
}

export async function generateUniqueSlug(base = 'new-doc'): Promise<string> {
  const existing = new Set((await getAllDocs()).map((d) => d.slug));
  if (!existing.has(base)) return base;
  for (let i = 2; i < 10_000; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function loadDoc(slug: string): Promise<LoadedDoc | null> {
  let doc: LoadedDoc | null = null;
  const admin = adminClientForLoader();
  if (admin) {
    doc = await loadDocFromSupabase(slug, admin);
  }
  if (!doc) {
    doc = loadDocFromFilesystem(slug);
  }
  if (!doc) return null;
  return {
    ...doc,
    document: prepareStudioDocument(doc.document, doc.sections),
  };
}

export async function createDoc(
  slug: string,
  title: string,
  locale = 'fr',
): Promise<void> {
  const existing = await loadDoc(slug);
  if (existing) throw new Error('Slug already exists');

  const { document, sections } = createDefaultDocument(title);
  const now = new Date().toISOString();

  if (hasSupabaseEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await upsertDocRecord(slug, title, locale);
    await saveDocToSupabase(slug, document, sections, { title });
    return;
  }

  const dir = docDir(slug);
  fs.mkdirSync(path.join(dir, 'sections'), { recursive: true });

  const meta: DocMeta = { slug, title, locale, createdAt: now, updatedAt: now };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(
    path.join(dir, 'document.json'),
    JSON.stringify(document, null, 2),
  );
}

export async function createImportedDoc(
  slug: string,
  title: string,
  locale: string,
  result: ImportResult,
): Promise<void> {
  const existing = await loadDoc(slug);
  if (existing) throw new Error('Slug already exists');

  const document: DocDocument = {
    ...result.document,
    blocks: resolveImportAssetPaths(result.document.blocks, slug),
  };

  const publicDir = path.join(process.cwd(), 'public', 'docs', slug);
  if (result.assets.length > 0) {
    fs.mkdirSync(publicDir, { recursive: true });
    for (const asset of result.assets) {
      fs.writeFileSync(path.join(publicDir, asset.filename), asset.buffer);
    }
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY && result.assets.length > 0) {
    await uploadDocAssets(
      slug,
      result.assets.map((asset) => ({
        path: `assets/${asset.filename}`,
        body: asset.buffer,
        contentType: asset.contentType,
      })),
    );
  }

  const now = new Date().toISOString();

  if (hasSupabaseEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await upsertDocRecord(slug, title, locale);
    await saveDocToSupabase(slug, document, result.sections, { title });
    return;
  }

  const dir = docDir(slug);
  fs.mkdirSync(path.join(dir, 'sections'), { recursive: true });

  const meta: DocMeta = { slug, title, locale, createdAt: now, updatedAt: now };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(
    path.join(dir, 'document.json'),
    JSON.stringify(document, null, 2),
  );

  for (const [ref, content] of Object.entries(result.sections)) {
    const filename = ref.replace('sections/', '');
    fs.writeFileSync(path.join(dir, 'sections', filename), content);
  }
}

export async function deleteDoc(slug: string): Promise<void> {
  if (hasSupabaseEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await deleteDocFromSupabase(slug);
    return;
  }

  const dir = docDir(slug);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function saveDoc(
  slug: string,
  document: DocDocument,
  sections: Record<string, string>,
  meta?: Partial<DocMeta>,
): Promise<void> {
  if (hasSupabaseEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await saveDocToSupabase(slug, document, sections, meta);
    return;
  }

  const dir = docDir(slug);
  const sectionsDir = path.join(dir, 'sections');
  fs.mkdirSync(sectionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'document.json'),
    JSON.stringify(document, null, 2),
  );

  for (const [ref, content] of Object.entries(sections)) {
    const filename = ref.replace('sections/', '');
    fs.writeFileSync(path.join(sectionsDir, filename), content);
  }

  const metaPath = path.join(dir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    const existing = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as DocMeta;
    const updated: DocMeta = {
      ...existing,
      ...meta,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2));
  }
}
