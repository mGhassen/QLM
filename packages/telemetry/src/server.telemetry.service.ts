import { TelemetryService } from './types';

export class ServerTelemetryService implements TelemetryService {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }
  async ready(): Promise<void> {
    return Promise.resolve();
  }
  async trackPageView(_path: string): Promise<void> {
    return Promise.resolve();
  }
  async trackEvent(
    _event: string,
    _properties?: Record<string, string>,
  ): Promise<void> {
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
