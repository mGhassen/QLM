export function parseOpener(content: string) {
  const lines = content.split('\n');
  return {
    label:
      lines.find((l) => l.startsWith('label: '))?.replace('label: ', '') ?? '',
    title:
      lines.find((l) => l.startsWith('title: '))?.replace('title: ', '') ?? '',
  };
}

export function serializeOpener(label: string, title: string) {
  const lines: string[] = [];
  if (label) lines.push(`label: ${label}`);
  if (title) lines.push(`title: ${title}`);
  return lines.join('\n');
}

export function parseFigure(content: string) {
  const lines = content.split('\n');
  return {
    src: lines.find((l) => l.startsWith('src: '))?.replace('src: ', '') ?? '',
    caption:
      lines.find((l) => l.startsWith('caption: '))?.replace('caption: ', '') ??
      '',
  };
}

export function serializeFigure(src: string, caption: string) {
  const lines: string[] = [];
  if (src) lines.push(`src: ${src}`);
  if (caption) lines.push(`caption: ${caption}`);
  return lines.join('\n');
}

export const BLOCK_VARIANTS: Record<string, string[]> = {
  alert: ['read', 'insight', 'warn', 'predict'],
  card: ['req', 't-yellow', 't-ink'],
  rail: ['dark', 'note', 'quote', 'img'],
};

export const BLOCK_LABELS: Record<string, string> = {
  page: 'Page',
  cover: 'Cover',
  coverSubt: 'Cover subtitle',
  coverToc: 'Cover TOC',
  brand: 'Brand',
  coverBody: 'Cover body',
  section: 'Section',
  seclabel: 'Section label',
  opener: 'Section title',
  split: 'Split layout',
  main: 'Main column',
  rail: 'Rail',
  flow: 'Flow',
  grid: 'Grid',
  box: 'Flex box',
  card: 'Card',
  alert: 'Alert',
  hero: 'Hero',
  table: 'Table',
  figure: 'Figure',
  phase: 'Agenda phase',
  pat: 'Numbered point',
  kpi: 'KPI',
  kpiband: 'KPI band',
  levels: 'Levels',
  level: 'Level',
  lvlcol: 'Column',
  vm: 'Value matrix',
  vmcol: 'Column',
  lcard: 'Level card',
  engines: 'Engines',
  subheading: 'Heading',
  paragraph: 'Paragraph',
  quote: 'Quote',
  break: 'Break',
};
