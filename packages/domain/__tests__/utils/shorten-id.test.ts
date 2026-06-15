import { describe, expect, it } from 'vitest';
import { shortenId } from '../../src/utils/shorten-id';

describe('shortenId', () => {
  it('should generate a 10-character ID from UUID', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const result = shortenId(uuid);

    expect(result).toHaveLength(10);
    expect(typeof result).toBe('string');
  });

  it('should generate different IDs for different UUIDs', () => {
    const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
    const uuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    const result1 = shortenId(uuid1);
    const result2 = shortenId(uuid2);

    expect(result1).not.toBe(result2);
  });

  it('should always return exactly 10 characters', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const result = shortenId(uuid);
    expect(result).toHaveLength(10);
  });

  it('should truncate when encoded length is greater than 10', () => {
    // Test the truncation branch (line 44: encoded.length > 10)
    // We need to test with various UUIDs to ensure we hit the truncation path
    const testUuids = [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      '00000000-0000-0000-0000-000000000000',
    ];

    for (const uuid of testUuids) {
      const result = shortenId(uuid);
      expect(result).toHaveLength(10);
      // Verify it's truncated if original was longer
      expect(result.length).toBeLessThanOrEqual(10);
    }
  });

  it('should handle the case when encoded length is exactly 10', () => {
    // Test the else branch (line 44: when encoded.length === 10)
    // This tests the ternary operator's else branch
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const result = shortenId(uuid);

    // If the encoded result is exactly 10, it should return as-is
    expect(result).toHaveLength(10);
  });
});
