#!/usr/bin/env tsx

import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import fs from 'fs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
for (const envPath of [
  path.join(scriptDir, '../../.env'),
  path.join(scriptDir, '../../../.env'),
]) {
  if (fs.existsSync(envPath)) config({ path: envPath });
}

const { loadDocsEnv } = await import('./load-env.cjs');
loadDocsEnv();

import { migrateHtmlToDocs } from './migrate-html-to-docs';
import { uploadDocs } from './seed-data';

function parseRemote(argv: string[]) {
  const idx = argv.indexOf('--remote');
  return idx >= 0 ? argv[idx + 1] : undefined;
}

async function importDoc() {
  const force = process.argv.includes('--force');
  const sourceArg = process.argv.find((a) => a.startsWith('--source='));
  const source = sourceArg?.slice('--source='.length);
  const remote = parseRemote(process.argv);

  console.log('📥 Importing doc...\n');

  const { slug, migrated } = migrateHtmlToDocs({ force, source });
  if (!migrated) {
    console.log(`Using existing content at content/docs/${slug}/\n`);
  }

  console.log(`📤 Uploading to Supabase...\n`);
  const { totalFiles } = await uploadDocs([slug], remote);

  console.log('\n🎉 Import completed!');
  console.log(`   - Document: ${slug}`);
  console.log(`   - Content files uploaded: ${totalFiles}`);
  console.log(`\n🔗 Preview: /docs/${slug}`);
  console.log(
    `🔗 Studio:  /prj/<project>/studio?tid=studio-doc:${encodeURIComponent(slug)}`,
  );
}

importDoc().catch((error: Error) => {
  console.error('❌ Import failed:', error.message);
  process.exit(1);
});
