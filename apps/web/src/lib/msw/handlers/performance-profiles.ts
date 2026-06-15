import { http, HttpResponse } from 'msw';

import { SEED_PERFORMANCE_PROFILES } from '../fixtures/performance-profiles';

function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const performanceProfilesHandlers = [
  http.get('/api/performance-profiles', async () => {
    const active = SEED_PERFORMANCE_PROFILES.filter((p) => p.isActive);
    return HttpResponse.json(await delay(active));
  }),

  http.get('/api/performance-profiles/:id', async ({ params }) => {
    const profile = SEED_PERFORMANCE_PROFILES.find(
      (p) => p.id === params['id'],
    );
    if (!profile) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(await delay(profile));
  }),
];
