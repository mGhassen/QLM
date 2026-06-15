import { describe, expect, test } from 'vitest';

import { encodeTabId } from './tab-id';
import { getTabKey } from './tab-key';

/**
 * Regression coverage and documented edge cases for the tab-key identity
 * protocol. The first test pins the RFC-0028 fix for malformed `tid`; the
 * remaining three document edge cases that are deliberately out of scope
 * for RFC-0028 and tracked separately for a future RFC-0027 follow-up.
 */
describe('tab system — tab-key identity', () => {
  test('malformed tid produces sentinel key, no collision with base routeBase tab', () => {
    const baseKey = getTabKey({ kind: 'contextual', routeBase: 'infrastructure' });
    const malformedKey = getTabKey({
      kind: 'contextual',
      routeBase: 'infrastructure',
      tid: 'totally-bogus-input',
    });

    expect(baseKey).toBe('infrastructure');
    expect(malformedKey).toBe('infrastructure#invalid:totally-bogus-input');
    expect(malformedKey).not.toBe(baseKey);
  });

  // Documented out-of-scope for RFC-0028; future canonical-key dedupe
  // story under RFC-0027 owns the fix.
  test('legacy tid prefixes (np:) and canonical (node-provider:) produce different tab keys for the same logical tab', () => {
    const longForm = getTabKey({
      kind: 'contextual',
      routeBase: 'infrastructure',
      tid: 'node-provider:aws',
    });
    const shortForm = getTabKey({
      kind: 'contextual',
      routeBase: 'infrastructure',
      tid: 'np:aws',
    });

    expect(longForm).toBe('node-provider:aws');
    expect(shortForm).toBe('np:aws');
    expect(longForm).not.toBe(shortForm);
  });

  // Documented out-of-scope for RFC-0028.
  test('encoder emits canonical long form; getTabKey returns it verbatim', () => {
    const encoded = encodeTabId({ kind: 'node-provider', provider: 'aws' });
    const tabKey = getTabKey({
      kind: 'contextual',
      routeBase: 'infrastructure',
      tid: encoded,
    });
    expect(encoded).toBe('node-provider:aws');
    expect(tabKey).toBe('node-provider:aws');
  });

  // Documented out-of-scope for RFC-0028.
  test('contextual and synthetic tabs share namespace prefix without colliding today', () => {
    const contextual = getTabKey({
      kind: 'contextual',
      routeBase: 'agent',
    });
    const synthetic = getTabKey({
      kind: 'synthetic',
      namespace: 'agent',
      slug: 'some-conv',
    });
    expect(contextual).toBe('agent');
    expect(synthetic).toBe('agent:some-conv');
  });
});
