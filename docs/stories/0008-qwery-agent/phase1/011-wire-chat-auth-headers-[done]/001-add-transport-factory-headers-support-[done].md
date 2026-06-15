---
story: ./story.md
status: done
layer: adapter
model: sonnet
files:
  - packages/agent-factory-sdk/src/services/default-transport.ts
  - packages/agent-factory-sdk/src/services/transport-factory.ts
  - packages/agent-factory-sdk/__tests__/services/transport-factory.test.ts
validation:
  kind: typecheck-only
---

# Add getHeaders option to default transport and transport factory

Extend the chat transport so callers can inject per-request headers (needed for the Supabase bearer token); ship a unit test that asserts the factory plumbs `getHeaders` down to `DefaultChatTransport`.

## Done when

- [ ] `default-transport.ts` exports `DefaultTransportOptions { getHeaders?: () => Record<string, string> | Promise<Record<string, string>> }` and passes `headers: options?.getHeaders` into `new DefaultChatTransport({...})`.
- [ ] `transport-factory.ts` exports `TransportFactoryOptions { getHeaders? }` and accepts an optional 3rd argument that is forwarded to `defaultTransport`.
- [ ] Existing two-arg `transportFactory(slug, model)` and single-arg `defaultTransport(api)` call sites keep compiling (option is truly optional).
- [ ] Unit test `__tests__/services/transport-factory.test.ts` mocks `DefaultChatTransport`, calls `transportFactory('slug', 'openai/gpt', { getHeaders: async () => ({ Authorization: 'Bearer t' }) })`, and asserts the mock received `headers` equal to the passed function.
- [ ] `pnpm --filter @qlm/agent-factory-sdk typecheck` passes and the new test passes under `pnpm --filter @qlm/agent-factory-sdk test`.

## Notes

- Mirror qwery-enterprise's signature verbatim (`getHeaders`, not `headers`) so the existing wrapper stays portable.
- `DefaultChatTransport` accepts `headers` as a function — no need to resolve it in our code; pass the function reference through.
