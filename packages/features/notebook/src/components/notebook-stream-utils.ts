/**
 * The notebook AI agent's response is a single text stream that interleaves
 * two channels:
 *   1. `[trace] ...\n` lines wrapped in zero-width-space (U+200B)
 *      delimiters, emitted on every tool-call / tool-result / error.
 *   2. plain text deltas (the SQL the model is writing).
 *
 * Split them so the popup can render trace as a dim side-rail and SQL as
 * a monospace block, and so the cell's code editor can mirror the SQL in
 * real time without ever displaying the trace markers.
 *
 * The U+200B delimiters are matched via the regex escape `\u200b`
 * (rather than the raw character) so the source file stays ASCII-only
 * and ESLint's `no-irregular-whitespace` rule does not trip on the
 * regex literal.
 */
const TRACE_MARKER_PATTERN = /\u200b\[trace\] ([^\n]*)\n\u200b/g;

export function splitNotebookStream(stream: string | undefined): {
  traceLines: string[];
  sqlText: string;
} {
  if (!stream) return { traceLines: [], sqlText: '' };
  const traceLines: string[] = [];
  const sqlText = stream.replace(
    TRACE_MARKER_PATTERN,
    (_match, line: string) => {
      const trimmed = line.trim();
      if (trimmed) traceLines.push(trimmed);
      return '';
    },
  );
  return { traceLines, sqlText };
}

/**
 * Extract the SQL body from the streamed agent response so it can be
 * shown in the cell editor as the model is typing. Mirrors the
 * client-side `extractSql` in `plugin-root.tsx` so the editor preview
 * matches what eventually lands in the cell when the stream completes.
 *
 * Returns an empty string when the stream contains only trace markers
 * or prose without a SQL keyword.
 */
export function extractStreamingSql(stream: string | undefined): string {
  if (!stream) return '';
  const { sqlText } = splitNotebookStream(stream);
  const fenced = sqlText.match(/```(?:sql|SQL)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? sqlText).trim();
  if (body.length === 0) return '';
  const sqlStart = body.search(
    /\b(SELECT|WITH|SHOW|EXPLAIN|INSERT|UPDATE|DELETE|CREATE|--)\b/i,
  );
  return (sqlStart >= 0 ? body.slice(sqlStart) : body).trim();
}
