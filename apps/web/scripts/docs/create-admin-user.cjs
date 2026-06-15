#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { parseArgs, getConfig } = require('./lib/supabase-config.cjs');
const { loadDocsEnv, syncLocalSupabaseFromCli, repoRoot, webDir } = require('./load-env.cjs');

loadDocsEnv();

async function findAuthUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return (
    data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ??
    null
  );
}

async function createAdminUser({ email, password, firstName, lastName, remote }) {
  const target = remote || 'local';
  const { supabaseUrl, serviceRoleKey, label } = getConfig(target);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔗 Target: ${label} Supabase (${supabaseUrl})`);
  console.log(`📝 Creating CMS user: ${email}\n`);

  const { data: createdAuth, error: createAuthError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
      },
    });

  if (createAuthError) {
    if (!createAuthError.message.toLowerCase().includes('already')) {
      throw createAuthError;
    }

    const existing = await findAuthUserByEmail(admin, email);
    if (!existing) {
      throw new Error(`Auth user exists but could not be found: ${email}`);
    }

    console.log(`ℹ️  Auth user already exists: ${email} (${existing.id})`);

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(
      existing.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
        },
      },
    );
    if (updateAuthError) throw updateAuthError;
    console.log(`✅ Password/metadata updated for ${email}`);
  } else {
    console.log(`✅ Auth user created: ${email} (${createdAuth.user.id})`);
  }

  console.log('\n🎉 CMS user ready');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Studio:   /prj/<project>/studio (sign in via /auth/sign-in)`);
}

const args = parseArgs(process.argv);
const email = args.email || process.env.ADMIN_EMAIL || 'admin@qlm.dev';
const password = args.password || process.env.ADMIN_PASSWORD || 'QLM2026!';
const firstName = args.first_name || process.env.ADMIN_FIRST_NAME || 'Admin';
const lastName = args.last_name || process.env.ADMIN_LAST_NAME || 'QLM';

if (!email || !password) {
  console.error(
    '❌ --email and --password are required (or set ADMIN_EMAIL / ADMIN_PASSWORD)',
  );
  process.exit(1);
}

createAdminUser({
  email,
  password,
  firstName,
  lastName,
  remote: args.remote,
}).catch((error) => {
  console.error(`❌ Failed: ${error.message}`);
  process.exit(1);
});
