/**
 * Custom ESLint rule — no-orchestration-write
 *
 * Errors on any assignment to a `.orchestration` property. RFC 0026 §5
 * makes orchestration the orchestrator's truth, not the UI's. Only
 * adapters (`packages/repositories/**`) and the server (`apps/server/**`)
 * are allowed to mutate it.
 *
 * Rationale: prevents the regression where UI code starts writing the
 * orchestrator's observed state. The five-axis decomposition only
 * works if each axis has a single writer.
 */

const ALLOWLIST_PATTERNS = [/\/packages\/repositories\//, /\/apps\/server\//];

function isAllowed(filename) {
  return ALLOWLIST_PATTERNS.some((p) => p.test(filename));
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid `.orchestration =` assignments outside adapters/server.',
    },
    schema: [],
    messages: {
      forbidden:
        '`node.orchestration` is observed-state owned by the orchestrator. UI code must never assign it. RFC 0026 §5.',
    },
  },
  create(context) {
    if (isAllowed(context.filename ?? context.getFilename?.() ?? '')) {
      return {};
    }
    return {
      AssignmentExpression(node) {
        const left = node.left;
        if (
          left &&
          left.type === 'MemberExpression' &&
          left.property &&
          left.property.type === 'Identifier' &&
          left.property.name === 'orchestration'
        ) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};

export default rule;
