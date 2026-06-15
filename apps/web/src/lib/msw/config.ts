export type MswConfig = Readonly<{
  enabled: boolean;
  onUnhandledRequest: 'bypass' | 'error' | 'warn';
}>;

export function getMswConfig(): MswConfig {
  const enabled = import.meta.env.VITE_MSW_ENABLED === '1';
  const strict = import.meta.env.VITE_MSW_STRICT === '1';

  return {
    enabled,
    onUnhandledRequest: strict ? 'error' : 'bypass',
  };
}
