/**
 * Workspace UI lives in {@link EnvironmentsPluginRoot} so the same tree stays mounted
 * when the URL goes between `/environments/…` (canvas) and `/environment/…` (service workspace).
 * Route still matches here
 * for loaders / shell; this outlet renders nothing.
 */
export function EnvironmentsProjectDeepOutlet(_props: Record<string, unknown>) {
  return null;
}
