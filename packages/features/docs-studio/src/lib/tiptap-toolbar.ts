import type { Editor } from '@tiptap/react';

const DEFAULT_TEXT_COLOR = '#161616';

export type BlockNodeType =
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'orderedList';

function rgbPartsToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((n) => Math.round(n).toString(16).padStart(2, '0'))
    .join('')}`;
}

function toHexColor(value: string): string {
  if (!value) return DEFAULT_TEXT_COLOR;
  const trimmed = value.trim();

  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed.slice(0, 7).toLowerCase();
  }

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)/,
  );
  if (rgbMatch) {
    return rgbPartsToHex(
      Number(rgbMatch[1]),
      Number(rgbMatch[2]),
      Number(rgbMatch[3]),
    );
  }

  const srgbMatch = trimmed.match(
    /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/,
  );
  if (srgbMatch) {
    return rgbPartsToHex(
      Number(srgbMatch[1]) * 255,
      Number(srgbMatch[2]) * 255,
      Number(srgbMatch[3]) * 255,
    );
  }

  if (typeof document !== 'undefined') {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = trimmed;
      const normalized = ctx.fillStyle;
      if (normalized.startsWith('#')) {
        return toHexColor(normalized);
      }
      if (normalized.startsWith('rgb')) {
        return toHexColor(normalized);
      }
    }
  }

  return DEFAULT_TEXT_COLOR;
}

export function getSelectionColor(editor: Editor): string {
  const markColor = editor.getAttributes('textStyle').color as
    | string
    | undefined;
  if (markColor) return toHexColor(markColor);

  const { view } = editor;
  if (!view?.dom) return DEFAULT_TEXT_COLOR;

  const { from } = view.state.selection;
  try {
    const dom = view.domAtPos(from);
    const el =
      dom.node.nodeType === 3
        ? (dom.node.parentElement as HTMLElement | null)
        : (dom.node as HTMLElement);
    if (el) return toHexColor(window.getComputedStyle(el).color);
  } catch {
    // ignore invalid positions during mount
  }
  return DEFAULT_TEXT_COLOR;
}

export function selectToolbarState({ editor }: { editor: Editor }) {
  return {
    isBold: editor.isActive('bold'),
    isItalic: editor.isActive('italic'),
    isUnderline: editor.isActive('underline'),
    isStrike: editor.isActive('strike'),
    isH2: editor.isActive('heading', { level: 2 }),
    isH3: editor.isActive('heading', { level: 3 }),
    isBulletList: editor.isActive('bulletList'),
    isOrderedList: editor.isActive('orderedList'),
    isAlignLeft: editor.isActive({ textAlign: 'left' }),
    isAlignCenter: editor.isActive({ textAlign: 'center' }),
    isAlignRight: editor.isActive({ textAlign: 'right' }),
    isAlignJustify: editor.isActive({ textAlign: 'justify' }),
    isLink: editor.isActive('link'),
    textColor: getSelectionColor(editor),
    inList: isListActive(editor),
    lineHeight: getBlockAttr(editor, 'lineHeight'),
    marginTop: getBlockAttr(editor, 'marginTop'),
    marginBottom: getBlockAttr(editor, 'marginBottom'),
    paddingLeft: getBlockAttr(editor, 'paddingLeft'),
    paddingTop: getBlockAttr(editor, 'paddingTop'),
    paddingBottom: getBlockAttr(editor, 'paddingBottom'),
  };
}

export function activeBlockType(editor: Editor): BlockNodeType {
  if (editor.isActive('bulletList')) return 'bulletList';
  if (editor.isActive('orderedList')) return 'orderedList';
  return editor.isActive('heading') ? 'heading' : 'paragraph';
}

export function isListActive(editor: Editor): boolean {
  return editor.isActive('bulletList') || editor.isActive('orderedList');
}

export function getBlockAttr(editor: Editor, key: string): string {
  const type = activeBlockType(editor);
  const val = editor.getAttributes(type)[key];
  return typeof val === 'string' ? val : '';
}

export function setBlockAttr(editor: Editor, key: string, value: string) {
  const type = activeBlockType(editor);
  const next = value === '' ? null : value;
  editor
    .chain()
    .focus()
    .updateAttributes(type, { [key]: next })
    .run();
}

export const LINE_HEIGHTS = [
  { label: 'Line —', value: '' },
  { label: '1.25', value: '1.25' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2', value: '2' },
];

export const VERTICAL_SPACING = [
  { label: '—', value: '' },
  { label: '-1em', value: '-1em' },
  { label: '-0.5em', value: '-0.5em' },
  { label: '0', value: '0' },
  { label: '0.5em', value: '0.5em' },
  { label: '1em', value: '1em' },
  { label: '1.5em', value: '1.5em' },
  { label: '2em', value: '2em' },
];

export const LIST_PADDING = [
  { label: '—', value: '' },
  { label: '-1em', value: '-1em' },
  { label: '-0.5em', value: '-0.5em' },
  { label: '0', value: '0' },
  { label: '0.5em', value: '0.5em' },
  { label: '1em', value: '1em' },
  { label: '1.5em', value: '1.5em' },
];
