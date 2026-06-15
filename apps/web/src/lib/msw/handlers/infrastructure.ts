import { http, HttpResponse } from 'msw';

import {
  generateInfrastructureActivity,
  generateInfrastructureSettings,
} from '../fixtures/infrastructure';

function latency<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const infrastructureHandlers = [
  http.get('/api/infrastructure/settings', async ({ request }) => {
    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) {
      return HttpResponse.json(
        { error: 'projectId required' },
        { status: 400 },
      );
    }
    return HttpResponse.json(
      await latency(generateInfrastructureSettings(projectId)),
    );
  }),

  http.get('/api/infrastructure/activity', async ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
      return HttpResponse.json(
        { error: 'projectId required' },
        { status: 400 },
      );
    }
    const source = (url.searchParams.get('source') ?? 'primary') as
      | 'primary'
      | 'replica';
    const range = (url.searchParams.get('range') ?? '7d') as
      | '7d'
      | '14d'
      | '30d';
    return HttpResponse.json(
      await latency(generateInfrastructureActivity(projectId, source, range)),
    );
  }),
];
