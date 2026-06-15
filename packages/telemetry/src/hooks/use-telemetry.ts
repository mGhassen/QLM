'use client';

import { useContext } from 'react';

import { TelemetryContext } from '../telemetry.context';

export function useTelemetry() {
  return useContext(TelemetryContext);
}
