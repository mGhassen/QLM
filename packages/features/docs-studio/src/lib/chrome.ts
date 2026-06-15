import type { CSSProperties } from 'react';
import type { ChromeZoneId, ChromeZoneStyle, DocChrome } from './types';

export interface ResolvedChrome {
  showHeader: boolean;
  showFooter: boolean;
  showOnCover: boolean;
  headerLeft: string;
  headerRight: string;
  footerLeft: string;
  footerRight: string;
  headerLeftHtml: string;
  headerRightHtml: string;
  footerLeftHtml: string;
  footerRightHtml: string;
  style?: DocChrome['style'];
}

export interface ChromeContext {
  title: string;
  page: number;
  total: number;
}

const ZONE_HTML_KEYS: Record<ChromeZoneId, keyof DocChrome> = {
  headerLeft: 'headerLeftHtml',
  headerRight: 'headerRightHtml',
  footerLeft: 'footerLeftHtml',
  footerRight: 'footerRightHtml',
};

const ZONE_PLAIN_KEYS: Record<ChromeZoneId, keyof DocChrome> = {
  headerLeft: 'headerLeft',
  headerRight: 'headerRight',
  footerLeft: 'footerLeft',
  footerRight: 'footerRight',
};

export function defaultDocChrome(title: string): DocChrome {
  return {
    headerEnabled: true,
    footerEnabled: true,
    showOnCover: false,
    headerLeft: title,
    headerRight: 'QLM Strategic Research',
    footerLeft: 'qlm.dev',
    footerRight: 'Page {{page}}',
  };
}

export function applyTokens(text: string, ctx: ChromeContext): string {
  return text
    .replace(/\{\{page\}\}/g, String(ctx.page))
    .replace(/\{\{total\}\}/g, String(ctx.total))
    .replace(/\{\{title\}\}/g, ctx.title);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return `<p>${escapeHtml(trimmed)}</p>`;
}

export function getZoneRawContent(
  chrome: DocChrome | undefined,
  zone: ChromeZoneId,
): string {
  const base = { ...defaultDocChrome(''), ...chrome };
  const htmlKey = ZONE_HTML_KEYS[zone];
  const plainKey = ZONE_PLAIN_KEYS[zone];
  const html = base[htmlKey] as string | undefined;
  if (html?.trim()) return html;
  const plain = base[plainKey] as string | undefined;
  return plain?.trim() ? plainToHtml(plain) : '';
}

export function getZoneContent(
  chrome: DocChrome | undefined,
  zone: ChromeZoneId,
  ctx: ChromeContext,
): string {
  return applyTokens(getZoneRawContent(chrome, zone), ctx);
}

function zoneHasContent(html: string): boolean {
  return (
    html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length > 0
  );
}

export function chromeZoneToStyle(
  zone: ChromeZoneId,
  chromeStyle: DocChrome['style'] | undefined,
): CSSProperties {
  if (!chromeStyle) return {};
  const band = zone.startsWith('header') ? 'header' : 'footer';
  const merged: ChromeZoneStyle = {
    ...chromeStyle[band],
    ...chromeStyle[zone],
  };
  const style: CSSProperties = {};
  if (merged.fontSizePt != null) style.fontSize = `${merged.fontSizePt}pt`;
  if (merged.color) style.color = merged.color;
  if (merged.fontWeight != null) style.fontWeight = merged.fontWeight;
  if (merged.textAlign) style.textAlign = merged.textAlign;
  return style;
}

export function resolveDocChrome(
  chrome: DocChrome | undefined,
  ctx: ChromeContext,
): ResolvedChrome {
  const base = { ...defaultDocChrome(ctx.title), ...chrome };
  const legacyOff =
    (chrome as { enabled?: boolean } | undefined)?.enabled === false;
  const headerEnabled = !legacyOff && base.headerEnabled !== false;
  const footerEnabled = !legacyOff && base.footerEnabled !== false;

  const headerLeftHtml = getZoneContent(base, 'headerLeft', ctx);
  const headerRightHtml = getZoneContent(base, 'headerRight', ctx);
  const footerLeftHtml = getZoneContent(base, 'footerLeft', ctx);
  const footerRightHtml = getZoneContent(base, 'footerRight', ctx);

  return {
    showHeader:
      headerEnabled &&
      !!(zoneHasContent(headerLeftHtml) || zoneHasContent(headerRightHtml)),
    showFooter:
      footerEnabled &&
      !!(zoneHasContent(footerLeftHtml) || zoneHasContent(footerRightHtml)),
    showOnCover: !!base.showOnCover,
    headerLeft: applyTokens(base.headerLeft ?? '', ctx),
    headerRight: applyTokens(base.headerRight ?? '', ctx),
    footerLeft: applyTokens(base.footerLeft ?? '', ctx),
    footerRight: applyTokens(base.footerRight ?? '', ctx),
    headerLeftHtml,
    headerRightHtml,
    footerLeftHtml,
    footerRightHtml,
    style: base.style,
  };
}

export function setZoneContent(
  chrome: DocChrome,
  zone: ChromeZoneId,
  html: string,
): DocChrome {
  const htmlKey = ZONE_HTML_KEYS[zone];
  const plainKey = ZONE_PLAIN_KEYS[zone];
  const plain = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return {
    ...chrome,
    [htmlKey]: html,
    [plainKey]: plain,
  };
}

export function pageHasCover(
  blocks: { type: string; props?: Record<string, unknown> }[],
): boolean {
  if (blocks.length === 0) return false;
  const first = blocks[0];
  if (first.type === 'cover') return true;
  if (first.type === 'section' && first.props?.variant === 'cover') return true;
  return false;
}
