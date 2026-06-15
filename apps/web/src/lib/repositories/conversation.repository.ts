import { RepositoryFindOptions } from '@guepard/domain/common';
import type { Conversation } from '@guepard/domain/entities';
import { IConversationRepository } from '@guepard/domain/repositories';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

/**
 * JSON over HTTP has no native Date — `createdAt` / `updatedAt` arrive as
 * ISO strings, but the domain `Conversation` type declares them as `Date`.
 * Without this rehydration step, anything that calls `.getTime()` (e.g.
 * sort comparators in `GetOrCreateDefaultConversationService`) throws.
 */
function rehydrate(c: Conversation | null | undefined): Conversation | null {
  if (!c) return c ?? null;
  const createdAt =
    c.createdAt instanceof Date
      ? c.createdAt
      : new Date(c.createdAt as unknown as string);
  const updatedAt =
    c.updatedAt instanceof Date
      ? c.updatedAt
      : new Date(c.updatedAt as unknown as string);
  return { ...c, createdAt, updatedAt };
}

function rehydrateMany(list: Conversation[]): Conversation[] {
  return list.map((c) => rehydrate(c) as Conversation);
}

export class ConversationRepository extends IConversationRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<Conversation[]> {
    const result = await apiGet<Conversation[]>('/conversations', false);
    return rehydrateMany(result || []);
  }

  async findById(id: string): Promise<Conversation | null> {
    const c = await apiGet<Conversation>(`/conversations/${id}`, true);
    return rehydrate(c);
  }

  async findBySlug(slug: string): Promise<Conversation | null> {
    const c = await apiGet<Conversation>(`/conversations/${slug}`, true);
    return rehydrate(c);
  }

  async findByProjectId(projectId: string): Promise<Conversation[]> {
    const result = await apiGet<Conversation[]>(
      `/conversations/project/${projectId}`,
      true,
    );
    return rehydrateMany(result || []);
  }

  async findByTaskId(taskId: string): Promise<Conversation[]> {
    const result = await apiGet<Conversation[]>(
      `/conversations/task/${taskId}`,
      true,
    );
    return rehydrateMany(result || []);
  }

  async create(entity: Conversation): Promise<Conversation> {
    const c = await apiPost<Conversation>('/conversations', entity);
    return rehydrate(c) as Conversation;
  }

  async update(entity: Conversation): Promise<Conversation> {
    const c = await apiPut<Conversation>(`/conversations/${entity.id}`, entity);
    return rehydrate(c) as Conversation;
  }

  async delete(id: string): Promise<boolean> {
    return apiDelete(`/conversations/${id}`);
  }
}
