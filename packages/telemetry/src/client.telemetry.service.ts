import { TelemetryService } from './types';

const isOnServer = typeof document === 'undefined';

export const DEFAULT_POSTHOG_KEY =
  'phc_1wb3ErK7DJgNWrGiZmH8mMUaPfEwSCuYJwOOT8JogJF';
export const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

/** Path-only api_host makes posthog-js resolve extension URLs as `/config.js` (wrong). Use full origin + path. */
function resolvePosthogApiHost(): string {
  const configured = import.meta.env.VITE_POSTHOG_INGESTION_URL ?? '/ingest';
  if (configured.startsWith('http://') || configured.startsWith('https://')) {
    return configured;
  }
  const path = configured.startsWith('/') ? configured : `/${configured}`;
  if (typeof window === 'undefined') {
    return path;
  }
  return `${window.location.origin}${path}`;
}

export class ClientTelemetryService implements TelemetryService {
  async initialize(): Promise<void> {
    if (isOnServer) {
      return Promise.resolve();
    }
    try {
      const { posthog } = await import('posthog-js');
      posthog.init(import.meta.env.VITE_POSTHOG_KEY || DEFAULT_POSTHOG_KEY, {
        api_host: resolvePosthogApiHost(),
        ui_host:
          import.meta.env.VITE_POSTHOG_HOST ||
          import.meta.env.VITE_POSTHOG_URL ||
          DEFAULT_POSTHOG_HOST,
        persistence: 'localStorage+cookie',
        person_profiles: 'always',
        capture_pageview: true,
        capture_pageleave: true,
      });
    } catch (err) {
      console.warn(
        '[telemetry] posthog init failed; continuing without it',
        err,
      );
    }
    return Promise.resolve();
  }
  async ready(): Promise<void> {
    return Promise.resolve();
  }
  async trackPageView(_path: string): Promise<void> {
    return Promise.resolve();
  }
  async trackEvent(
    event: string,
    properties?: Record<string, string>,
  ): Promise<void> {
    if (isOnServer) {
      return Promise.resolve();
    }
    const { posthog } = await import('posthog-js');
    posthog.capture(event, properties);
    return Promise.resolve();
  }
  async identify(
    _userId: string,
    _traits?: Record<string, string>,
  ): Promise<void> {
    return Promise.resolve();
  }
  async trackError(_error: Error): Promise<void> {
    return Promise.resolve();
  }
  async trackUsage(_usage: string): Promise<void> {
    return Promise.resolve();
  }
  async trackPerformance(_performance: string): Promise<void> {
    return Promise.resolve();
  }
  async trackFeatureUsage(_feature: string): Promise<void> {
    return Promise.resolve();
  }
  async trackAgent(_agent: string): Promise<void> {
    return Promise.resolve();
  }
  async addProvider(_provider: string, _config: object): Promise<void> {
    return Promise.resolve();
  }
  async removeProvider(_provider: string): Promise<void> {
    return Promise.resolve();
  }
}
