---
story: ./story.md
status: done
layer: features
files:
  - packages/features/qwery-agent/src/hooks/use-billing-balance.ts
---

# Add useBillingBalance hook

## Purpose

Feature-local query hook that fetches the active org's balance via the existing `GET /api/billing/status?orgSlug=...` route. Mirrors qwery-enterprise's `useGetOrganizationBilling` pattern but uses fetch (no new shell-runtime layer).

## Files

- `packages/features/qwery-agent/src/hooks/use-billing-balance.ts` — **new**. Exports `useBillingBalance(): UseQueryResult<{ balance: number; invoicesCount: number }>`. Uses `useShell().orgSlug` + `useQuery` + fetch. `staleTime: 30_000`.

## Acceptance

- [ ] `useBillingBalance()` returns a `UseQueryResult` whose `.data` is typed `{ balance: number; invoicesCount: number } | undefined`.
- [ ] Query key: `['billing-balance', orgSlug]` so the query is per-org and React Query caches across panel/tab renders.
- [ ] `pnpm --filter @guepard/qwery-agent typecheck` passes.

## Test plan

```
pnpm --filter @guepard/qwery-agent typecheck
```

## Notes

- URL construction: `` `/api/billing/status?orgSlug=${encodeURIComponent(shell.orgSlug)}` ``.
- No retry policy beyond React Query's default — if the endpoint is down we'll show a loading state.
- The endpoint also returns `invoicesCount` which we don't use here; keep it in the return type for forward-compat.
