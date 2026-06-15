'use client';

import { createContext } from 'react';

import { ClientTelemetryService } from './client.telemetry.service';
import { TelemetryManager } from './types';

export const TelemetryContext = createContext<TelemetryManager>(
  new ClientTelemetryService(),
);
