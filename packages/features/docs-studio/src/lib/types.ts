export type BlockType =
  | 'page'
  | 'cover'
  | 'brand'
  | 'coverBody'
  | 'coverSubt'
  | 'coverToc'
  | 'section'
  | 'seclabel'
  | 'opener'
  | 'split'
  | 'main'
  | 'rail'
  | 'flow'
  | 'grid'
  | 'box'
  | 'card'
  | 'alert'
  | 'hero'
  | 'kpiband'
  | 'kpi'
  | 'table'
  | 'figure'
  | 'quote'
  | 'phase'
  | 'levels'
  | 'level'
  | 'lvlcol'
  | 'vm'
  | 'vmcol'
  | 'lcard'
  | 'pat'
  | 'engines'
  | 'subheading'
  | 'paragraph'
  | 'pull'
  | 'cquote'
  | 'raw'
  | 'break';

export interface BlockNode {
  id: string;
  type: BlockType;
  props?: Record<string, unknown>;
  content?: string;
  contentRef?: string;
  children?: BlockNode[];
}

export interface DocTheme {
  brand?: string;
  ink?: string;
  surface?: string;
  bg?: string;
  eyebrow?: string;
}

export type DocLayoutMode = 'paginated' | 'web';

export type DocPageFormat = import('./page-format').DocPageFormat;
export type DocPageSetup = import('./page-setup').DocPageSetup;

export type ChromeZoneId =
  | 'headerLeft'
  | 'headerRight'
  | 'footerLeft'
  | 'footerRight';

export interface ChromeZoneStyle {
  fontSizePt?: number;
  color?: string;
  fontWeight?: number;
  textAlign?: 'left' | 'right' | 'center';
}

export interface DocChromeStyle {
  header?: ChromeZoneStyle;
  footer?: ChromeZoneStyle;
  headerLeft?: ChromeZoneStyle;
  headerRight?: ChromeZoneStyle;
  footerLeft?: ChromeZoneStyle;
  footerRight?: ChromeZoneStyle;
}

export interface DocChrome {
  headerEnabled?: boolean;
  footerEnabled?: boolean;
  showOnCover?: boolean;
  headerLeft?: string;
  headerRight?: string;
  footerLeft?: string;
  footerRight?: string;
  headerLeftHtml?: string;
  headerRightHtml?: string;
  footerLeftHtml?: string;
  footerRightHtml?: string;
  style?: DocChromeStyle;
}

export interface DocDocument {
  version: number;
  /** Primary prose + embedded design tags (v2 flow docs). */
  body?: string;
  blocks: BlockNode[];
  theme?: DocTheme;
  layoutMode?: DocLayoutMode;
  pageFormat?: DocPageFormat;
  pageSetup?: DocPageSetup;
  chrome?: DocChrome;
}

export interface DocMeta {
  slug: string;
  title: string;
  locale: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LoadedDoc {
  meta: DocMeta;
  document: DocDocument;
  sections: Record<string, string>;
}

export interface DocListItem {
  slug: string;
  title: string;
  updatedAt: string;
}
