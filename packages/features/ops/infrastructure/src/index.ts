export { PluginRoot as InfrastructurePluginRoot } from './presentation/plugin-root';
export { FlatRoot as InfrastructureFlatRoot } from './presentation/flat-root';
export { resolveProjectContext as resolveInfrastructureProjectContext } from './application/resolve-context';
export {
  ListPage as InfrastructureListPage,
  DetailsSheet as InfrastructureDetailsSheet,
  DetailPage as InfrastructureDetailPage,
  HealthStatusBadge,
} from './presentation/components';

/**
 * Re-exports for the MSW fixtures + any downstream consumer that previously
 * imported types from this pkg. The canonical location is now
 * `@qlm/domain/entities` — prefer that in new code; this barrel keeps
 * legacy imports working without a codemod sweep.
 */
export {
  NODE_KINDS,
  NODE_REGIONS,
  NODE_PROVIDERS,
  NODE_LIFECYCLE_STATES,
  NODE_ORCHESTRATION_STATES,
  NODE_ELIGIBILITY_STATES,
  NODE_HEALTH,
  NodeSchema,
} from '@qlm/domain/entities';
export type {
  Node,
  NodeKind,
  NodeRegion,
  NodeProvider,
  NodeLifecycleState,
  NodeOrchestrationState,
  NodeEligibility,
  NodeHealth,
} from '@qlm/domain/entities';
export type {
  CreateNodeInput,
  UpdateNodeInput,
} from '@qlm/domain/usecases';
