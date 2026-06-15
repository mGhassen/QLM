# guepard-console-v3


### Run testing containers

``` bash
docker compose -f docker/extensions/docker-compose.extensions.yml up -d
```

```bash
E2E_BASE_URL=http://localhost:3000 E2E_REUSE_SERVER=true pnpm exec playwright test tests/user-tokens/create-reveal-revoke.spec.ts --headed
```