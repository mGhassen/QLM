#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
for (const envPath of [
  path.join(scriptDir, '../../.env'),
  path.join(scriptDir, '../../../.env'),
]) {
  if (fs.existsSync(envPath)) config({ path: envPath });
}

const { loadDocsEnv } = await import('./load-env.cjs');
loadDocsEnv();

import { prepareStudioDocument } from '@qlm/docs-studio/lib/studio-document';
import type { DocDocument, DocMeta } from '@qlm/docs-studio/lib/types';

import { parseArgs, getConfig } from './lib/supabase-config.cjs';

const DOCS_DIR = path.join(process.cwd(), 'content', 'docs');
const IMG_DIR = path.join(process.cwd(), 'public', 'docs');
const BUCKET = 'docs';

async function uploadDocAssets(
  supabase: SupabaseClient,
  slug: string,
  files: { path: string; body: Buffer | string; contentType: string }[],
) {
  for (const file of files) {
    const storagePath = `${slug}/${file.path}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.body, {
        contentType: file.contentType,
        upsert: true,
      });
    if (error) {
      throw new Error(`Upload failed (${storagePath}): ${error.message}`);
    }
  }
}

async function upsertDocRecord(
  supabase: SupabaseClient,
  slug: string,
  title: string,
  locale: string,
) {
  const { error } = await supabase.from('doc_documents').upsert(
    { slug, title, locale, storage_prefix: slug, published: false },
    { onConflict: 'slug' },
  );
  if (error) throw new Error(`DB upsert failed for ${slug}: ${error.message}`);
}

function loadSections(dir: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionsDir = path.join(dir, 'sections');
  if (!fs.existsSync(sectionsDir)) return sections;

  for (const file of fs
    .readdirSync(sectionsDir)
    .filter((f) => f.endsWith('.md'))) {
    sections[`sections/${file}`] = fs.readFileSync(
      path.join(sectionsDir, file),
      'utf-8',
    );
  }
  return sections;
}

async function uploadSlug(supabase: SupabaseClient, slug: string) {
  const dir = path.join(DOCS_DIR, slug);
  const meta = JSON.parse(
    fs.readFileSync(path.join(dir, 'meta.json'), 'utf-8'),
  ) as DocMeta;
  const rawDocument = JSON.parse(
    fs.readFileSync(path.join(dir, 'document.json'), 'utf-8'),
  ) as DocDocument;
  const sections = loadSections(dir);
  const document = prepareStudioDocument(rawDocument, sections);

  await upsertDocRecord(supabase, slug, meta.title, meta.locale || 'fr');

  const files: { path: string; body: Buffer | string; contentType: string }[] =
    [
      {
        path: 'document.json',
        body: JSON.stringify(document, null, 2),
        contentType: 'application/json',
      },
    ];

  for (const [ref, content] of Object.entries(sections)) {
    files.push({
      path: ref,
      body: content,
      contentType: 'text/markdown',
    });
  }

  await uploadDocAssets(supabase, slug, files);

  const imgSlugDir = path.join(IMG_DIR, slug);
  if (fs.existsSync(imgSlugDir)) {
    const imgFiles: { path: string; body: Buffer; contentType: string }[] = [];
    for (const file of fs.readdirSync(imgSlugDir)) {
      const ext = path.extname(file).toLowerCase();
      const contentType =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream';
      imgFiles.push({
        path: `assets/${file}`,
        body: fs.readFileSync(path.join(imgSlugDir, file)),
        contentType,
      });
    }
    if (imgFiles.length > 0) await uploadDocAssets(supabase, slug, imgFiles);
  }

  console.log(`✅ Uploaded doc: ${slug} (${files.length} content files)`);
  return files.length;
}

async function uploadDocsToSupabase(
  supabase: SupabaseClient,
  slugs: string[],
) {
  let totalFiles = 0;
  for (const slug of slugs) {
    totalFiles += await uploadSlug(supabase, slug);
  }
  return totalFiles;
}

export async function uploadDocs(slugs: string[], target = 'local') {
  const resolvedTarget = target;
  const { supabaseUrl, serviceRoleKey, label } = getConfig(resolvedTarget);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: pingError } = await supabase
    .from('doc_documents')
    .select('slug')
    .limit(1);
  if (pingError) {
    throw new Error(
      `doc_documents table not found. Run migrations first.\n${pingError.message}`,
    );
  }

  console.log(`🔗 Target: ${label} Supabase (${supabaseUrl})`);
  const totalFiles = await uploadDocsToSupabase(supabase, slugs);
  return { slugs, totalFiles, label, supabaseUrl };
}

function parseSlugs(argv: string[]) {
  const slugs: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) i++;
      continue;
    }
    slugs.push(arg);
  }
  return slugs;
}

async function seedData() {
  const args = parseArgs(process.argv);
  const target = args.remote || 'local';
  console.log('🌱 Starting QLM CMS data seeding...\n');

  const cliSlugs = parseSlugs(process.argv);
  const slugs =
    cliSlugs.length > 0
      ? cliSlugs
      : fs.existsSync(DOCS_DIR)
        ? fs
            .readdirSync(DOCS_DIR, { withFileTypes: true })
            .filter(
              (d) =>
                d.isDirectory() &&
                fs.existsSync(path.join(DOCS_DIR, d.name, 'meta.json')),
            )
            .map((d) => d.name)
        : [];

  if (slugs.length === 0) {
    console.log('⚠️  No docs found in content/docs/.');
    return;
  }

  console.log(`📄 Seeding ${slugs.length} document(s): ${slugs.join(', ')}`);
  const { totalFiles } = await uploadDocs(slugs, target);

  console.log('\n🎉 Data seeding completed!');
  console.log(`   - Documents: ${slugs.length}`);
  console.log(`   - Content files uploaded: ${totalFiles}`);
  console.log(`\n🔗 Preview: /docs/${slugs[0]}`);
  console.log(`🔗 Studio:  /prj/<project>/studio?tid=studio-doc:${encodeURIComponent(slugs[0]!)}`);
}

const isMain = process.argv[1]?.includes('seed-data');
if (isMain) {
  seedData().catch((error: Error) => {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  });
}
