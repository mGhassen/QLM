import { describe, expect, it } from 'vitest';
import type { MessageOutput } from '@qlm/domain/usecases';

import { convertMessages } from '../src/utils/convert-messages';

function fixture(overrides: Partial<MessageOutput> = {}): MessageOutput {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'hello',
    createdAt: new Date('2026-04-16T10:00:00Z'),
    updatedAt: new Date('2026-04-16T10:00:00Z'),
    ...overrides,
  } as unknown as MessageOutput;
}

describe('convertMessages', () => {
  it('returns undefined when input is undefined', () => {
    expect(convertMessages(undefined)).toBeUndefined();
  });

  it('returns an empty array when input is empty', () => {
    expect(convertMessages([])).toEqual([]);
  });

  it('passes through modern parts-shaped content verbatim', () => {
    const msg = fixture({
      id: 'modern-1',
      content: {
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hi there' }],
        metadata: { model: 'gpt-5.2' },
      } as unknown as MessageOutput['content'],
    });
    const [converted] = convertMessages([msg])!;
    expect(converted).toBeDefined();
    expect(converted!.id).toBe('modern-1');
    expect(converted!.role).toBe('assistant');
    expect(converted!.parts).toEqual([{ type: 'text', text: 'Hi there' }]);
    expect(converted!.metadata).toMatchObject({
      model: 'gpt-5.2',
      createdAt: '2026-04-16T10:00:00.000Z',
    });
  });

  it('merges content.metadata + root metadata on modern messages', () => {
    const msg = fixture({
      content: {
        role: 'user',
        parts: [{ type: 'text', text: 'q' }],
        metadata: { fromContent: true },
      } as unknown as MessageOutput['content'],
      metadata: { fromRoot: true } as unknown as MessageOutput['metadata'],
    });
    const [converted] = convertMessages([msg])!;
    expect(converted!.metadata).toMatchObject({
      fromContent: true,
      fromRoot: true,
    });
  });

  it('reconstructs a text part from legacy string content', () => {
    const msg = fixture({
      id: 'legacy-1',
      role: 'user',
      content: 'raw text' as unknown as MessageOutput['content'],
    });
    const [converted] = convertMessages([msg])!;
    expect(converted!.parts).toEqual([{ type: 'text', text: 'raw text' }]);
    expect(converted!.role).toBe('user');
  });

  it('reconstructs a text part from legacy { text } content', () => {
    const msg = fixture({
      content: { text: 'wrapped' } as unknown as MessageOutput['content'],
    });
    const [converted] = convertMessages([msg])!;
    expect(converted!.parts).toEqual([{ type: 'text', text: 'wrapped' }]);
  });

  it('stringifies unknown legacy content shapes', () => {
    const msg = fixture({
      content: { weird: 'payload' } as unknown as MessageOutput['content'],
    });
    const [converted] = convertMessages([msg])!;
    expect(converted!.parts[0]).toEqual({
      type: 'text',
      text: JSON.stringify({ weird: 'payload' }),
    });
  });
});
