import type { DatasourceMetadata } from '../../entities';
import type {
  PredictionAgentConversation,
  PredictionAgentMessage,
  PredictionAgentMessageRole,
  PredictionSchemaSnapshot,
} from '../../entities';

export type TakeSnapshotInput = {
  datasourceId: string;
  projectId: string;
  takenBy: string;
  metadata: DatasourceMetadata;
};

export type ListSnapshotsByDatasourceInput = {
  datasourceId: string;
};

export type GetSnapshotByIdInput = {
  id: string;
};

export type CreateAgentConversationInput = {
  snapshotId: string;
  projectId: string;
  createdBy: string;
};

export type AppendAgentMessageInput = {
  conversationId: string;
  role: PredictionAgentMessageRole;
  content: string;
};

export type ListAgentMessagesInput = {
  conversationId: string;
};

export type PredictionSchemaSnapshotOutput = PredictionSchemaSnapshot;
export type PredictionAgentConversationOutput = PredictionAgentConversation;
export type PredictionAgentMessageOutput = PredictionAgentMessage;
