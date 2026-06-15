import { describe, expect, it } from 'vitest';

import type { Conversation } from '../../../src/entities';
import { IConversationRepository } from '../../../src/repositories';
import { GetOrCreateDefaultConversationService } from '../../../src/services/conversation/get-or-create-default-conversation.usecase';

const PROJECT_A = '11111111-1111-4111-8111-111111111111';
const USER_A = '22222222-2222-4222-8222-222222222222';
const USER_B = '33333333-3333-4333-8333-333333333333';

class MockConversationRepository extends IConversationRepository {
  public store = new Map<string, Conversation>();
  public createCalls = 0;

  async findAll() {
    return Array.from(this.store.values());
  }

  async findById(id: string) {
    return this.store.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    return Array.from(this.store.values()).find((c) => c.slug === slug) ?? null;
  }

  async findByProjectId(projectId: string) {
    return Array.from(this.store.values()).filter(
      (c) => c.projectId === projectId,
    );
  }

  async findByTaskId(taskId: string) {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  async create(entity: Conversation) {
    this.createCalls += 1;
    this.store.set(entity.id, entity);
    return entity;
  }

  async update(entity: Conversation) {
    this.store.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.store.delete(id);
  }
}

function seed(
  repo: MockConversationRepository,
  overrides: Partial<Conversation>,
): Conversation {
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    slug: `slug-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Conversation',
    seedMessage: '',
    projectId: PROJECT_A,
    taskId: crypto.randomUUID(),
    datasources: [],
    createdAt: new Date('2026-04-16T10:00:00Z'),
    updatedAt: new Date('2026-04-16T10:00:00Z'),
    createdBy: USER_A,
    updatedBy: USER_A,
    isPublic: false,
    ...overrides,
  };
  repo.store.set(conversation.id, conversation);
  return conversation;
}

describe('GetOrCreateDefaultConversationService', () => {
  it('creates a new conversation when none exists for the user', async () => {
    const repo = new MockConversationRepository();
    const service = new GetOrCreateDefaultConversationService(repo);

    const result = await service.execute({
      projectId: PROJECT_A,
      userId: USER_A,
    });

    expect(repo.createCalls).toBe(1);
    expect(result.projectId).toBe(PROJECT_A);
    expect(result.createdBy).toBe(USER_A);
    expect(result.title).toBe('Conversation');
  });

  it('returns the existing conversation for the user without creating a new one', async () => {
    const repo = new MockConversationRepository();
    const existing = seed(repo, {
      projectId: PROJECT_A,
      createdBy: USER_A,
    });
    const service = new GetOrCreateDefaultConversationService(repo);

    const result = await service.execute({
      projectId: PROJECT_A,
      userId: USER_A,
    });

    expect(repo.createCalls).toBe(0);
    expect(result.id).toBe(existing.id);
    expect(result.slug).toBe(existing.slug);
  });

  it('is idempotent: two calls return the same conversation', async () => {
    const repo = new MockConversationRepository();
    const service = new GetOrCreateDefaultConversationService(repo);

    const first = await service.execute({
      projectId: PROJECT_A,
      userId: USER_A,
    });
    const second = await service.execute({
      projectId: PROJECT_A,
      userId: USER_A,
    });

    expect(repo.createCalls).toBe(1);
    expect(second.id).toBe(first.id);
    expect(second.slug).toBe(first.slug);
  });

  it('returns the most-recently-updated conversation when multiple exist', async () => {
    const repo = new MockConversationRepository();
    const older = seed(repo, {
      projectId: PROJECT_A,
      createdBy: USER_A,
      updatedAt: new Date('2026-04-14T00:00:00Z'),
    });
    const newer = seed(repo, {
      projectId: PROJECT_A,
      createdBy: USER_A,
      updatedAt: new Date('2026-04-16T00:00:00Z'),
    });
    const service = new GetOrCreateDefaultConversationService(repo);

    const result = await service.execute({
      projectId: PROJECT_A,
      userId: USER_A,
    });

    expect(repo.createCalls).toBe(0);
    expect(result.id).toBe(newer.id);
    expect(result.id).not.toBe(older.id);
  });

  it('ignores conversations owned by other users and creates a new one', async () => {
    const repo = new MockConversationRepository();
    seed(repo, {
      projectId: PROJECT_A,
      createdBy: USER_B,
    });
    const service = new GetOrCreateDefaultConversationService(repo);

    const result = await service.execute({
      projectId: PROJECT_A,
      userId: USER_A,
    });

    expect(repo.createCalls).toBe(1);
    expect(result.createdBy).toBe(USER_A);
  });
});
