import { DomainException } from '@qlm/domain/exceptions';

// Explicit per-code overrides — used when the band heuristic below is
// wrong for a specific code. RFC 0026 added node mutations that need
// 404/409/400 specifically. Node range moved to 3200-3299 during the
// merge with main (which reserved 3100-3199 for personal-account).
const CODE_TO_STATUS: Record<number, number> = {
  3200: 404, // NODE_NOT_FOUND_ERROR
  3201: 409, // NODE_VERSION_CONFLICT_ERROR
  3202: 400, // NODE_INVALID_STATUS_TRANSITION_ERROR
  3300: 404, // PREDICTION_SNAPSHOT_NOT_FOUND_ERROR
  3301: 413, // PREDICTION_SNAPSHOT_TOO_LARGE_ERROR
  3302: 404, // PREDICTION_CONVERSATION_NOT_FOUND_ERROR
  3303: 503, // PREDICTION_AGENT_PROVIDER_UNAVAILABLE_ERROR
};

export function handleDomainException(error: unknown): Response {
  if (error instanceof DomainException) {
    const override = CODE_TO_STATUS[error.code];
    const status =
      override ??
      // Resource-not-found bands: 2xxx (existing) and 3000 (USER_TOKEN_NOT_FOUND_ERROR).
      ((error.code >= 2000 && error.code < 3000) || error.code === 3000
        ? 404
        : error.code >= 400 && error.code < 500
          ? error.code
          : 500);
    return Response.json(
      {
        error: error.message,
        code: error.code,
        data: error.data,
      },
      { status },
    );
  }
  const errorMessage =
    error instanceof Error ? error.message : 'Internal server error';
  return Response.json({ error: errorMessage }, { status: 500 });
}

export function parsePositiveInt(
  raw: string | null,
  fallback: number | null,
): number | null {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function parseLimit(
  raw: string | null,
  fallback: number,
  max: number,
): number {
  const parsed = parsePositiveInt(raw, fallback);
  if (parsed === null) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
