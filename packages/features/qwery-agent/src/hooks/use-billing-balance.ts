import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useShell } from '@guepard/shell-runtime';

export type BillingBalance = {
  balance: number;
  invoicesCount: number;
};

/**
 * Fetch the active organization's credit balance. Feature-local hook (no
 * shell-runtime billing resource) — mirrors qwery-enterprise's pattern of
 * hitting the existing `GET /api/billing/status?orgSlug=...` endpoint
 * directly. The server-side HTTP 402 gate on `/api/chat/:slug` remains the
 * source of truth; this hook only powers the client-side pre-submit UX.
 */
export function useBillingBalance(): UseQueryResult<BillingBalance> {
  const shell = useShell();
  return useQuery<BillingBalance>({
    queryKey: ['billing-balance', shell.orgSlug],
    queryFn: async () => {
      const res = await fetch(
        `/api/billing/status?orgSlug=${encodeURIComponent(shell.orgSlug)}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch billing status: ${res.status}`);
      }
      return res.json();
    },
    staleTime: 30_000,
    enabled: !!shell.orgSlug,
  });
}
