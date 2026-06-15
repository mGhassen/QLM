export {
  ShellAppProvider,
  useShellApp,
  type ShellAppContextValue,
  type GetDatasourceMetadataFn,
  type RunQueryFn,
  type TestConnectionFn,
  type TestConnectionResult,
  type PredictionsHostClient,
} from './context';

export {
  FlatRouteProvider,
  useFlatRoute,
  type FlatRouteContextValue,
} from './flat-route-context';

export {
  DocsPanelProvider,
  useDocsPanel,
  type DocsPanelContextValue,
  type DocsPanelProviderProps,
} from './docs-panel-context';

export { useShell, type ShellClient } from './client';

export { useRuntime, type Platform } from './runtime';

export type { NotebooksResource } from './resources/notebooks';
export type { NodesResource } from './resources/nodes';
export type {
  ConversationsResource,
  CreateConversationResourceInput,
  UpdateConversationResourceInput,
} from './resources/conversations';
export type { MessagesResource } from './resources/messages';
export type { DatasourcesResource } from './resources/datasources';
export type {
  IntegrationsResource,
  IntegrationsHttpClient,
} from './resources/integrations';
export type { ProjectsResource } from './resources/projects';
export type { OrganizationsResource } from './resources/organizations';
export type { QueryResource } from './resources/query';
