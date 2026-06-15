import type { BlockType } from './types';

const LAYOUT_CONTAINER_TYPES = new Set<BlockType>([
  'break',
  'page',
  'section',
  'cover',
  'split',
  'grid',
  'levels',
]);

const ALL_RESIZE_HANDLES: ResizeHandle[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

export function canBlockResize(
  type: BlockType,
  _props: Record<string, unknown> = {},
): boolean {
  return !LAYOUT_CONTAINER_TYPES.has(type);
}

export function resizeHandlesFor(_type: BlockType): ResizeHandle[] {
  return ALL_RESIZE_HANDLES;
}

export function shouldCommitResize(
  handle: ResizeHandle,
  dx: number,
  dy: number,
  threshold = 3,
): boolean {
  if (handle === 'e' || handle === 'w') return Math.abs(dx) >= threshold;
  if (handle === 'n' || handle === 's') return Math.abs(dy) >= threshold;
  if (handle === 'move')
    return Math.abs(dx) >= threshold || Math.abs(dy) >= threshold;
  return Math.abs(dx) >= threshold || Math.abs(dy) >= threshold;
}

export interface StudioTransform {
  width?: string;
  height?: string;
  minHeight?: string;
  translateX?: number;
  translateY?: number;
}

export type ResizeHandle =
  | 'move'
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';

const TRANSFORM_STYLE_KEYS = [
  'width',
  'height',
  'minHeight',
  'transform',
  'position',
  'boxSizing',
  'flex',
] as const;

export function parsePx(value: unknown, fallback: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (value.endsWith('%')) return fallback;
    const n = parseFloat(value);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

export function layoutSize(value: unknown, measured: number): number {
  if (typeof value === 'string' && value.endsWith('%')) return measured;
  return parsePx(value, measured);
}

function snap(value: number, enabled: boolean): number {
  return enabled ? Math.round(value) : value;
}

export function computeTransform(
  handle: ResizeHandle,
  dx: number,
  dy: number,
  start: {
    width: number;
    height: number;
    translateX: number;
    translateY: number;
  },
  options?: { snap?: boolean; aspectRatio?: number | null },
): StudioTransform {
  const snapValues = options?.snap ?? true;
  const ratio = options?.aspectRatio ?? null;

  if (handle === 'move') {
    return {
      translateX: snap(start.translateX + dx, snapValues),
      translateY: snap(start.translateY + dy, snapValues),
    };
  }

  let width = start.width;
  let height = start.height;
  let translateX = start.translateX;
  let translateY = start.translateY;

  if (handle.includes('e')) width = start.width + dx;
  if (handle.includes('w')) width = start.width - dx;
  if (handle.includes('s')) height = start.height + dy;
  if (handle.includes('n')) height = start.height - dy;

  if (ratio && ratio > 0) {
    const isHorizontal = handle === 'e' || handle === 'w';
    const isVertical = handle === 'n' || handle === 's';
    if (isHorizontal) {
      height = width / ratio;
    } else if (isVertical) {
      width = height * ratio;
    } else if (Math.abs(dx) >= Math.abs(dy)) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
  }

  const affectsWidth = handle.includes('e') || handle.includes('w');
  const affectsHeight = handle.includes('n') || handle.includes('s');

  const result: StudioTransform = {};

  if (affectsWidth) {
    width = Math.max(40, snap(width, snapValues));
    result.width = `${width}px`;
    if (handle.includes('w')) {
      translateX = start.translateX + (start.width - width);
    }
  }

  if (affectsHeight) {
    height = Math.max(16, snap(height, snapValues));
    result.height = `${height}px`;
    result.minHeight = `${height}px`;
    if (handle.includes('n')) {
      translateY = start.translateY + (start.height - height);
    }
  }

  if (handle.includes('w')) {
    result.translateX = snap(translateX, snapValues);
  }
  if (handle.includes('n')) {
    result.translateY = snap(translateY, snapValues);
  }

  return result;
}

export function applyTransformStyle(
  el: HTMLElement,
  patch: StudioTransform,
): void {
  if (patch.width) {
    el.style.width = patch.width;
    el.style.flex = '0 0 auto';
  }
  if (patch.height) el.style.height = patch.height;
  if (patch.minHeight) el.style.minHeight = patch.minHeight;

  const tx = patch.translateX ?? 0;
  const ty = patch.translateY ?? 0;
  el.style.transform = tx || ty ? `translate(${tx}px, ${ty}px)` : '';
  el.style.position = 'relative';
  el.style.boxSizing = 'border-box';
}

export function clearTransformStyle(el: HTMLElement): void {
  for (const key of TRANSFORM_STYLE_KEYS) {
    el.style.removeProperty(
      key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
    );
  }
}

export function restoreTransformFromProps(
  el: HTMLElement,
  props: Record<string, unknown>,
): void {
  clearTransformStyle(el);
  const patch: StudioTransform = {};
  if (props.width) patch.width = props.width as string;
  if (props.height) patch.height = props.height as string;
  if (props.minHeight) patch.minHeight = props.minHeight as string;
  const tx = props.translateX as number | undefined;
  const ty = props.translateY as number | undefined;
  if (tx) patch.translateX = tx;
  if (ty) patch.translateY = ty;
  if (Object.keys(patch).length > 0) applyTransformStyle(el, patch);
}

export function snapTransform(patch: StudioTransform): StudioTransform {
  const result: StudioTransform = {};
  if (patch.width) result.width = `${Math.round(parsePx(patch.width, 0))}px`;
  if (patch.height) {
    const h = Math.round(parsePx(patch.height, 0));
    result.height = `${h}px`;
    result.minHeight = `${h}px`;
  }
  if (patch.translateX != null)
    result.translateX = Math.round(patch.translateX);
  if (patch.translateY != null)
    result.translateY = Math.round(patch.translateY);
  return result;
}
