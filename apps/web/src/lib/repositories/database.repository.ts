import type { Database } from '@qlm/domain/entities';
import { IDatabaseRepository } from '@qlm/domain/repositories';

import { apiDelete, apiGet, apiPatch, apiPost } from './api-client';

export class DatabaseHttpRepository extends IDatabaseRepository {
  async findAll(): Promise<Database[]> {
    const data = await apiGet<Database[]>('/databases', false);
    return data ?? [];
  }

  async findByAccountId(_accountId: string): Promise<Database[]> {
    return this.findAll();
  }

  async findById(id: string): Promise<Database | null> {
    return apiGet<Database>(`/databases/${encodeURIComponent(id)}`, true);
  }

  async create(entity: Database): Promise<Database> {
    return apiPost<Database>('/databases', entity);
  }

  async update(entity: Database): Promise<Database> {
    const { id, ...payload } = entity;
    return apiPatch<Database>(`/databases/${encodeURIComponent(id)}`, payload);
  }

  async delete(id: string): Promise<void> {
    await apiDelete(`/databases/${encodeURIComponent(id)}`);
  }
}
