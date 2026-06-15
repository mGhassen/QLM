import { getSupabaseBrowserClient } from '@qlm/supabase/browser-client';

function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env) {
    const url = process.env.VITE_API_URL ?? process.env.SERVER_API_URL ?? '';
    if (url) return url;
  }
  return import.meta.env?.VITE_API_URL || '/api';
}

/**
 * Resolve the current Supabase access token for server API calls.
 *
 * `getSession()` can return null on the first tick after hydration while
 * `@supabase/ssr` is still reading cookies — HTTP routes that require a
 * bearer (e.g. `/api/me/preferences`) then 401 even though the user is
 * signed in. Fall back to `refreshSession()` before giving up.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;

  const { data, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const accessToken = await getAccessToken();
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(
  response: Response,
  allowNotFound = false,
): Promise<T | null> {
  if (response.status === 404 && allowNotFound) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: response.statusText || 'Unknown error',
    }));

    throw new ApiError(
      errorData.error || errorData.message || 'Request failed',
      response.status,
      errorData.code,
      errorData.data,
    );
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json();
}

export interface ApiGetOptions {
  allowNotFound?: boolean;
  signal?: AbortSignal;
  timeout?: number;
}

export interface ApiRequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  headers?: Record<string, string>;
}

export async function apiGet<T>(
  endpoint: string,
  allowNotFound = false,
  options?: ApiGetOptions,
): Promise<T | null> {
  const controller = options?.signal ? undefined : new AbortController();
  const timeoutId =
    options?.timeout && controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      credentials: 'include',
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return handleResponse<T>(
      response,
      allowNotFound || options?.allowNotFound || false,
    );
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

export async function apiPost<T>(
  endpoint: string,
  data: unknown,
  options?: ApiRequestOptions,
): Promise<T> {
  const controller = options?.signal ? undefined : new AbortController();
  const timeoutId =
    options?.timeout && controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      credentials: 'include',
      body: JSON.stringify(data),
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const result = await handleResponse<T>(response, false);
    if (result === null) {
      throw new ApiError('Unexpected null response', response.status);
    }
    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

export async function apiPatch<T>(
  endpoint: string,
  data: unknown,
  options?: ApiRequestOptions,
): Promise<T> {
  const controller = options?.signal ? undefined : new AbortController();
  const timeoutId =
    options?.timeout && controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      credentials: 'include',
      body: JSON.stringify(data),
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const result = await handleResponse<T>(response, false);
    if (result === null) {
      throw new ApiError('Unexpected null response', response.status);
    }
    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

export async function apiPut<T>(
  endpoint: string,
  data: unknown,
  options?: ApiRequestOptions,
): Promise<T> {
  const controller = options?.signal ? undefined : new AbortController();
  const timeoutId =
    options?.timeout && controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      credentials: 'include',
      body: JSON.stringify(data),
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const result = await handleResponse<T>(response, false);
    if (result === null) {
      throw new ApiError('Unexpected null response', response.status);
    }
    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

export interface DriverCommandBasePayload {
  datasourceProvider: string;
  driverId: string;
  config: unknown;
}

export interface DriverCommandQueryPayload extends DriverCommandBasePayload {
  sql: string;
}

export type DriverCommandPayload =
  | DriverCommandBasePayload
  | DriverCommandQueryPayload;

interface DriverCommandResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function driverCommand<T>(
  action: 'testConnection' | 'query' | 'metadata',
  payload: DriverCommandPayload,
  options?: ApiRequestOptions,
): Promise<T> {
  const body = { ...payload, action };
  const result = await apiPost<DriverCommandResponse<T>>(
    '/driver/command',
    body,
    options,
  );

  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'Driver command failed');
  }

  return result.data;
}

export async function apiDelete(
  endpoint: string,
  options?: ApiRequestOptions,
): Promise<boolean> {
  const controller = options?.signal ? undefined : new AbortController();
  const timeoutId =
    options?.timeout && controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      credentials: 'include',
      signal: options?.signal || controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      await handleResponse<never>(response, false);
    }

    return true;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}
