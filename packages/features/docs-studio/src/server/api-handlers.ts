import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import type { DocDocument } from '#/lib/types';
import {
  createDoc,
  createImportedDoc,
  deleteDoc,
  generateUniqueSlug,
  getAllDocs,
  loadDoc,
  saveDoc,
} from '#/lib/loader';
import { importHtml, importPdf, slugify } from '#/lib/import';
import { uploadDocAssets } from '#/supabase/docs';
import { loadDocForRequest } from '#/server/load-doc';
import {
  jsonWithCookies,
  requireCmsUser,
  unauthorized,
} from '#/server/require-cms-user';

const createDocSchema = z.object({
  title: z.string().min(1).max(200).default('New Doc'),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  locale: z.string().default('fr'),
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;
const IMPORT_MAX_SIZE = 20 * 1024 * 1024;
const IMPORT_HTML_TYPES = ['text/html', 'application/xhtml+xml'];
const IMPORT_PDF_TYPES = ['application/pdf'];

function detectImportType(file: File): 'html' | 'pdf' | null {
  const ext = path.extname(file.name).toLowerCase();
  if (
    IMPORT_HTML_TYPES.includes(file.type) ||
    ext === '.html' ||
    ext === '.htm'
  ) {
    return 'html';
  }
  if (IMPORT_PDF_TYPES.includes(file.type) || ext === '.pdf') {
    return 'pdf';
  }
  return null;
}

function safeFilename(name: string) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '-');
  return base || `image-${Date.now()}.png`;
}

export async function handleListDocs(request: Request) {
  const { user, headers } = await requireCmsUser(request);
  if (!user) return unauthorized(headers);

  return jsonWithCookies(await getAllDocs(), { status: 200 }, headers);
}

export async function handleCreateDoc(request: Request) {
  const { user, headers } = await requireCmsUser(request);
  if (!user) return unauthorized(headers);

  const body = await request.json();
  const parsed = createDocSchema.safeParse(body);
  if (!parsed.success) {
    return jsonWithCookies(
      { error: 'Invalid data', details: parsed.error.flatten() },
      { status: 400 },
      headers,
    );
  }

  const slug = parsed.data.slug ?? (await generateUniqueSlug());

  try {
    await createDoc(slug, parsed.data.title, parsed.data.locale);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create doc';
    if (message === 'Slug already exists') {
      return jsonWithCookies({ error: message }, { status: 409 }, headers);
    }
    return jsonWithCookies({ error: message }, { status: 500 }, headers);
  }

  return jsonWithCookies({ slug }, { status: 201 }, headers);
}

export async function handleGetDoc(request: Request, slug: string) {
  const { user, headers } = await requireCmsUser(request);
  if (!user) return unauthorized(headers);

  const doc = await loadDocForRequest(request, slug);
  if (!doc) {
    return jsonWithCookies({ error: 'Not found' }, { status: 404 }, headers);
  }

  return jsonWithCookies(doc, { status: 200 }, headers);
}

export async function handleSaveDoc(request: Request, slug: string) {
  const { user, headers } = await requireCmsUser(request);
  if (!user) return unauthorized(headers);

  const body = await request.json();
  const { document, sections, meta } = body as {
    document: DocDocument;
    sections: Record<string, string>;
    meta?: { title?: string };
  };

  if (!document || !sections) {
    return jsonWithCookies(
      { error: 'Invalid payload' },
      { status: 400 },
      headers,
    );
  }

  await saveDoc(slug, document, sections, meta);
  return jsonWithCookies({ ok: true }, { status: 200 }, headers);
}

export async function handleDeleteDoc(request: Request, slug: string) {
  const { user, headers } = await requireCmsUser(request);
  if (!user) return unauthorized(headers);

  await deleteDoc(slug);
  return jsonWithCookies({ ok: true }, { status: 200 }, headers);
}

export async function handlePreviewDoc(slug: string) {
  const doc = await loadDoc(slug);
  if (!doc) {
    return jsonWithCookies({ error: 'Not found' }, { status: 404 });
  }
  return jsonWithCookies(doc, { status: 200 });
}

export async function handleUploadDocAsset(request: Request, slug: string) {
  const { user, headers } = await requireCmsUser(request);
  if (!user) return unauthorized(headers);

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return jsonWithCookies(
      { error: 'No file provided' },
      { status: 400 },
      headers,
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return jsonWithCookies(
      { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
      { status: 400 },
      headers,
    );
  }

  if (file.size > MAX_SIZE) {
    return jsonWithCookies(
      { error: 'File too large. Maximum size: 5MB' },
      { status: 400 },
      headers,
    );
  }

  const filename = safeFilename(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const publicUrl = `/docs/${slug}/${filename}`;

  const publicDir = path.join(process.cwd(), 'public', 'docs', slug);
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, filename), buffer);

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await uploadDocAssets(slug, [
      {
        path: `assets/${filename}`,
        body: buffer,
        contentType: file.type,
      },
    ]);
  }

  return jsonWithCookies({ url: publicUrl }, { status: 201 }, headers);
}

export async function handleImportDoc(request: Request) {
  const { user, headers } = await requireCmsUser(request);
  if (!user) return unauthorized(headers);

  const formData = await request.formData();
  const file = formData.get('file');
  const titleField = formData.get('title');

  if (!(file instanceof File)) {
    return jsonWithCookies(
      { error: 'No file provided' },
      { status: 400 },
      headers,
    );
  }

  if (file.size > IMPORT_MAX_SIZE) {
    return jsonWithCookies(
      { error: 'File too large. Maximum size: 20MB' },
      { status: 413 },
      headers,
    );
  }

  const kind = detectImportType(file);
  if (!kind) {
    return jsonWithCookies(
      { error: 'Invalid file type. Allowed: HTML, PDF' },
      { status: 400 },
      headers,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed =
      kind === 'html'
        ? importHtml(buffer.toString('utf-8'), file.name)
        : await importPdf(buffer, file.name);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to parse document';
    return jsonWithCookies({ error: message }, { status: 400 }, headers);
  }

  const title =
    typeof titleField === 'string' && titleField.trim()
      ? titleField.trim().slice(0, 200)
      : parsed.title.slice(0, 200);
  const slug = await generateUniqueSlug(slugify(title));

  try {
    await createImportedDoc(slug, title, 'fr', parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to import document';
    if (message === 'Slug already exists') {
      return jsonWithCookies({ error: message }, { status: 409 }, headers);
    }
    return jsonWithCookies({ error: message }, { status: 500 }, headers);
  }

  return jsonWithCookies({ slug, title }, { status: 201 }, headers);
}
