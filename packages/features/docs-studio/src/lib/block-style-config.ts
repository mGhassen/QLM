import type { BlockType } from './types';

export type StylePanelSection =
  | 'typePreset'
  | 'layout'
  | 'spacing'
  | 'size'
  | 'position'
  | 'typography'
  | 'background';

const TEXT_BLOCKS: BlockType[] = [
  'paragraph',
  'quote',
  'opener',
  'pat',
  'seclabel',
  'subheading',
];

const PRESET_BLOCKS: BlockType[] = [
  'card',
  'alert',
  'rail',
  'figure',
  'table',
  'level',
  'lcard',
  'levels',
];

const LAYOUT_BLOCKS: BlockType[] = [
  'grid',
  'box',
  'section',
  'split',
  'levels',
];

const CONTAINER_BLOCKS: BlockType[] = [
  'main',
  'flow',
  'vm',
  'levels',
  'level',
  'kpiband',
];

const NO_STYLE_BLOCKS: BlockType[] = ['break'];

export function getStylePanelSections(type: BlockType): StylePanelSection[] {
  if (NO_STYLE_BLOCKS.includes(type)) return [];

  const sections: StylePanelSection[] = [];

  if (type === 'coverSubt' || PRESET_BLOCKS.includes(type))
    sections.push('typePreset');
  if (LAYOUT_BLOCKS.includes(type) || type === 'cover' || type === 'coverBody')
    sections.push('layout');

  sections.push('spacing', 'size');

  if (
    LAYOUT_BLOCKS.includes(type) ||
    CONTAINER_BLOCKS.includes(type) ||
    type === 'hero'
  ) {
    sections.push('position');
  }

  if (TEXT_BLOCKS.includes(type) || type === 'hero' || type === 'brand') {
    sections.push('typography');
  }

  sections.push('background');

  return sections;
}

export function hasStylePanel(type: BlockType): boolean {
  return getStylePanelSections(type).length > 0;
}
