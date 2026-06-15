import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRuntime } from '../src/runtime';

describe('useRuntime', () => {
  it('returns "web"', () => {
    const { result } = renderHook(() => useRuntime());
    expect(result.current).toBe('web');
  });
});
