import ReactMarkdown, {
  type Components as ReactMarkdownComponents,
} from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '../lib/utils';

/**
 * Thin wrapper around `react-markdown` + GitHub-flavored-markdown for
 * rendering static documentation content (help pages, release notes,
 * inline explanations).
 *
 * **What it handles for you:**
 *   - `remark-gfm` so tables, task lists, strikethrough, and autolinks
 *     render without each caller wiring it up
 *   - Default `prose prose-sm dark:prose-invert max-w-none` classes so
 *     headings, lists, code blocks, and tables get sensible typography
 *     out of the box (requires `@tailwindcss/typography` in the host
 *     — already configured in `apps/web/styles/global.css` and the
 *     Storybook preview)
 *   - Opens in-document anchor links in the same tab; leaves full
 *     URLs to the default behaviour (the typography plugin styles the
 *     underline)
 *
 * **What it deliberately does NOT handle:**
 *   - Rich runtime interactions (tool calls, embedded widgets,
 *     SQL-fence expansion). For AI-chat rendering with those features,
 *     see `@qlm/ui/ai/markdown-components` — it's a dedicated
 *     heavy render path.
 *   - Loading remote content. Callers pass the source in directly,
 *     which means imports via Vite `?raw` or fetched strings both work.
 *
 * @example
 * ```tsx
 * // Import a .md file via Vite `?raw` so content lives as plain text.
 * import source from './aws-permissions.md?raw';
 * import { Markdown } from '@qlm/ui/markdown';
 *
 * export function AwsHelp() {
 *   return <Markdown source={source} />;
 * }
 * ```
 */
export type MarkdownProps = Readonly<{
  /** Raw markdown source as a plain string. */
  source: string;
  /**
   * Optional class overrides. Merged with the default `prose` chain via
   * `cn()` so you can tweak spacing without losing the typography defaults.
   */
  className?: string;
  /**
   * Optional override map for individual element renderers. See
   * [react-markdown's docs](https://github.com/remarkjs/react-markdown#appendix-b-components)
   * for the full shape. Leave undefined to use plain HTML elements
   * (styled by the `prose` classes).
   */
  components?: ReactMarkdownComponents;
}>;

const DEFAULT_CLASSES =
  'prose prose-sm dark:prose-invert max-w-none ' +
  // Slightly tighter code blocks — the typography plugin's defaults
  // are too heavy for sidebar help content.
  'prose-pre:my-3 prose-pre:bg-muted/50 prose-code:text-xs ' +
  // Make inline code visually distinct without the plugin's default
  // quote marks.
  "prose-code:before:content-[''] prose-code:after:content-['']";

export function Markdown({
  source,
  className,
  components,
}: MarkdownProps): React.ReactElement {
  return (
    <div className={cn(DEFAULT_CLASSES, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
