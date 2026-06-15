function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--remote') {
      const target = argv[i + 1];
      if (target && !target.startsWith('--')) {
        args.remote = target;
        i++;
      } else {
        args.remote = 'prod';
      }
      continue;
    }
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-/g, '_');
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      console.error(`❌ Missing value for ${arg}`);
      process.exit(1);
    }
    args[key] = value;
    i++;
  }
  return args;
}

function getConfig(target) {
  const configs = {
    prod: {
      url: process.env.REMOTE_PROD_SUPABASE_URL,
      key: process.env.REMOTE_PROD_SUPABASE_SERVICE_ROLE_KEY,
      label: 'remote prod',
    },
    dev: {
      url: process.env.REMOTE_DEV_SUPABASE_URL,
      key: process.env.REMOTE_DEV_SUPABASE_SERVICE_ROLE_KEY,
      label: 'remote dev',
    },
    local: {
      url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      label: 'local',
    },
  };

  const config = configs[target] || configs.local;

  if (!config.url) {
    const envName =
      target === 'prod'
        ? 'REMOTE_PROD_SUPABASE_URL'
        : target === 'dev'
          ? 'REMOTE_DEV_SUPABASE_URL'
          : 'VITE_SUPABASE_URL';
    console.error(`❌ ${envName} is required`);
    process.exit(1);
  }

  if (!config.key) {
    const envName =
      target === 'prod'
        ? 'REMOTE_PROD_SUPABASE_SERVICE_ROLE_KEY'
        : target === 'dev'
          ? 'REMOTE_DEV_SUPABASE_SERVICE_ROLE_KEY'
          : 'SUPABASE_SERVICE_ROLE_KEY';
    console.error(`❌ ${envName} is required`);
    process.exit(1);
  }

  return {
    supabaseUrl: config.url,
    serviceRoleKey: config.key,
    label: config.label,
  };
}

module.exports = { parseArgs, getConfig };
