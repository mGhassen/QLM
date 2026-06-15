export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function modKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

export function altKey(): string {
  return isMac() ? '⌥' : 'Alt';
}

export function formatShortcut(keys: string): string {
  const mod = modKey();
  const alt = altKey();
  return keys
    .replace(/\bMod\b/g, mod)
    .replace(/\bAlt\b/g, alt)
    .replace(/\bShift\b/g, '⇧')
    .replace(/\bDelete\b/g, 'Del')
    .replace(/\+/g, isMac() ? '' : '+')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleWithShortcut(label: string, keys: string): string {
  return `${label} (${formatShortcut(keys)})`;
}

export interface StudioShortcut {
  label: string;
  keys: string;
}

export const STUDIO_SHORTCUTS: StudioShortcut[] = [
  { label: 'Save', keys: 'Mod+S' },
  { label: 'Undo', keys: 'Mod+Z' },
  { label: 'Redo', keys: 'Mod+Shift+Z' },
  { label: 'Duplicate block', keys: 'Mod+D' },
  { label: 'Delete block', keys: 'Delete' },
  { label: 'Move block up', keys: 'Alt+↑' },
  { label: 'Move block down', keys: 'Alt+↓' },
  { label: 'Nest block (move in)', keys: 'Alt+→' },
  { label: 'Unnest block (move out)', keys: 'Alt+←' },
  { label: 'Deselect block', keys: 'Esc' },
];

export const EDITOR_SHORTCUTS: StudioShortcut[] = [
  { label: 'Bold', keys: 'Mod+B' },
  { label: 'Italic', keys: 'Mod+I' },
  { label: 'Underline', keys: 'Mod+U' },
  { label: 'Strikethrough', keys: 'Mod+Shift+S' },
];

export function isEditingTarget(target: EventTarget | null): boolean {
  return !!(target as HTMLElement | null)?.closest(
    'input, textarea, select, .ProseMirror, [contenteditable="true"]',
  );
}
