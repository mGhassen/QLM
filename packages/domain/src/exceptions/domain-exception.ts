import { CodeDescription } from '../common/code';
import { Exception, CreateExceptionPayload } from '../common/exception';
import { Optional } from '../common/common-types';

export type CreateDomainExceptionPayload<TData> = CreateExceptionPayload<TData>;

/**
 * DomainException represents domain-specific errors in the domain layer.
 * It wraps the base Exception class and provides domain-specific error handling.
 *
 * @template TData - Optional data payload associated with the exception
 */
export class DomainException<TData = void> extends Error {
  private readonly _exception: Exception<TData>;
  public readonly domainCode: CodeDescription;
  public readonly code: number;
  public readonly data: Optional<TData>;

  private constructor(exception: Exception<TData>) {
    super(exception.message);
    this._exception = exception;
    this.domainCode = {
      code: exception.code,
      message: exception.message,
    };
    this.code = exception.code;
    this.data = exception.data;
    this.name = 'DomainException';

    // Preserve stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Creates a new DomainException instance
   *
   * @param payload - The exception payload containing code, optional message override, and optional data
   * @returns A new DomainException instance
   *
   * @example
   * ```typescript
   * throw DomainException.new({
   *   code: Code.NOTEBOOK_NOT_FOUND_ERROR,
   *   overrideMessage: 'Notebook with id 123 not found',
   *   data: { notebookId: '123' }
   * });
   * ```
   */
  public static new<TData = void>(
    payload: CreateDomainExceptionPayload<TData>,
  ): DomainException<TData> {
    const exception = Exception.new(payload);
    return new DomainException(exception);
  }
}
