import { describe, expect, it } from 'vitest';
import { Code } from '../../src/common/code';
import { DomainException } from '../../src/exceptions';

describe('DomainException', () => {
  it('should create exception with code and message', () => {
    const exception = DomainException.new({
      code: Code.NOTEBOOK_NOT_FOUND_ERROR,
      overrideMessage: 'Notebook not found',
    });

    expect(exception).toBeInstanceOf(Error);
    expect(exception).toBeInstanceOf(DomainException);
    expect(exception.message).toBe('Notebook not found');
    expect(exception.code).toBe(Code.NOTEBOOK_NOT_FOUND_ERROR.code);
    expect(exception.name).toBe('DomainException');
  });

  it('should include data payload', () => {
    const exception = DomainException.new({
      code: Code.NOTEBOOK_NOT_FOUND_ERROR,
      overrideMessage: 'Notebook not found',
      data: { notebookId: '123' },
    });

    expect(exception.data).toEqual({ notebookId: '123' });
  });

  it('should have stack trace', () => {
    const exception = DomainException.new({
      code: Code.NOTEBOOK_NOT_FOUND_ERROR,
      overrideMessage: 'Notebook not found',
    });

    expect(exception.stack).toBeDefined();
    expect(typeof exception.stack).toBe('string');
  });

  it('should have domainCode property', () => {
    const exception = DomainException.new({
      code: Code.NOTEBOOK_NOT_FOUND_ERROR,
      overrideMessage: 'Notebook not found',
    });

    expect(exception.domainCode).toBeDefined();
    expect(exception.domainCode.code).toBe(Code.NOTEBOOK_NOT_FOUND_ERROR.code);
    expect(exception.domainCode.message).toBe('Notebook not found');
  });
});
