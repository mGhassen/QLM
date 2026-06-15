import { TelemetryContext } from '../telemetry.context';
import { telemetry } from '../index';

export function TelemetryProvider(props: React.PropsWithChildren) {
  return (
    <TelemetryContext.Provider value={telemetry}>
      {props.children}
    </TelemetryContext.Provider>
  );
}
