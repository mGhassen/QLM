/**
 * Canonical tab identity — a port of VS Code's `EditorInput.matches`
 * concept onto the project shell. Two tabs that resolve to the same
 * key are the same logical tab; opening the second one should
 * activate the first instead of creating a duplicate.
 *
 * VS Code reference:
 *   - `src/vs/workbench/common/editor/editorInput.ts` (`matches`)
 *   - `src/vs/workbench/common/editor/editorGroupModel.ts` (`indexOf`,
 *     `findEditor`)
 *
 * The key is a stable string. Routes derive a `TabKeyDescriptor` from
 * URL params; `getTabKey(descriptor)` produces the canonical form.
 */

import { decodeTabId } from './tab-id';

export type TabKeyDescriptor =
  /** Standard `/prj/{slug}/{routeBase}` view. `tid` may be undefined. */
  | { kind: 'contextual'; routeBase: string; tid?: string }
  /** Flat short URL `/{flatPrefix}/{firstParam}/...`. */
  | { kind: 'flat'; flatPrefix: string; firstParam: string }
  /** Synthetic surfaces mounted outside `/prj/...` (e.g. agent). */
  | { kind: 'synthetic'; namespace: string; slug: string };

/**
 * Produce the canonical tab key for a descriptor. Stable across
 * routing, persistence, and tab-bar identity.
 *
 * Rules (mirror VS Code's "exact reference > composite > none"):
 *   - contextual without tid → routeBase only ("infrastructure")
 *   - contextual with valid tid → tid is already namespaced (kind:payload)
 *   - contextual with malformed tid → fall back to routeBase (no
 *     duplicate orphan tabs)
 *   - flat → "{flatPrefix}:{firstParam}"
 *   - synthetic → "{namespace}:{slug}"
 */
export function getTabKey(descriptor: TabKeyDescriptor): string {
  switch (descriptor.kind) {
    case 'contextual': {
      if (!descriptor.tid) return descriptor.routeBase;
      const decoded = decodeTabId(descriptor.tid);
      if (decoded) return descriptor.tid;
      // Malformed `tid` gets a sentinel key so a broken URL never collapses
      // onto the clean routeBase tab's identity. Two distinct bad URLs also
      // produce two distinct keys (we include the raw `tid`).
      return `${descriptor.routeBase}#invalid:${descriptor.tid}`;
    }
    case 'flat':
      return `${descriptor.flatPrefix}:${descriptor.firstParam}`;
    case 'synthetic':
      return `${descriptor.namespace}:${descriptor.slug}`;
  }
}

/**
 * VS Code-style `matches` for tab keys. Currently strict equality; the
 * indirection exists so we can later add composite matching (e.g.
 * "node-name:foo matches a topology-pool tab containing foo") without
 * touching the call sites.
 */
export function tabKeyMatches(a: string, b: string): boolean {
  return a === b;
}
