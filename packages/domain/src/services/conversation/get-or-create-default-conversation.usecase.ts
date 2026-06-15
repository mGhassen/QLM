import { ConversationEntity, Conversation } from '../../entities';
import { IConversationRepository } from '../../repositories';
import { ConversationOutput } from '../../usecases';

export type GetOrCreateDefaultConversationInput = {
  projectId: string;
  userId: string;
};

/**
 * Returns the user's most-recently-updated conversation in the given project,
 * or creates a fresh default conversation if none exists. Idempotent: calling
 * twice in succession returns the same conversation.
 *
 * Used by the Qwery Agent panel to bootstrap a per-(user, project)
 * conversation on first open. Filters by `createdBy` in-service rather than
 * adding a port method — low-volume path, panel-only.
 */
export class GetOrCreateDefaultConversationService {
  constructor(
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute(
    input: GetOrCreateDefaultConversationInput,
  ): Promise<ConversationOutput> {
    const all = await this.conversationRepository.findByProjectId(
      input.projectId,
    );
    // Defensive: `updatedAt` is declared `Date` but JSON-over-HTTP repos
    // can return strings when rehydration upstream misses. Use a safe
    // conversion so a single bad row doesn't crash the panel-bootstrap path.
    const toMs = (v: Date | string | unknown): number => {
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v as string | number);
        return Number.isFinite(d.getTime()) ? d.getTime() : 0;
      }
      return 0;
    };
    const own = all
      .filter((c) => c.createdBy === input.userId)
      .sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));

    if (own[0]) {
      return ConversationOutput.new(own[0]);
    }

    const created = await this.conversationRepository.create(
      ConversationEntity.create({
        title: 'Conversation',
        seedMessage: '',
        projectId: input.projectId,
        // Panel conversations are not linked to a task; assign a fresh UUID
        // to satisfy the schema's `taskId` (z.uuid()) constraint. Future:
        // make taskId optional in the schema if "no-task" becomes common.
        taskId: crypto.randomUUID(),
        datasources: [],
        createdBy: input.userId,
      }) as unknown as Conversation,
    );

    return ConversationOutput.new(created);
  }
}
