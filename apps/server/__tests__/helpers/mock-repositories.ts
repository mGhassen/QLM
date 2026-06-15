import type {
  Repositories,
  CreateUserTokenRow,
} from '@qlm/domain/repositories';
import type {
  Organization,
  UserPreferences,
  UserPreferencesPayload,
  UserToken,
} from '@qlm/domain/entities';
import type { OrganizationBillingData } from '@qlm/domain/usecases';
import type { RepositoryFindOptions } from '@qlm/domain/common';
import { shortenId } from '@qlm/domain/utils';

type InMemoryStore<T> = Map<string, T>;
type SlugIndex = Map<string, string>; // slug -> id

function createInMemoryRepo<T extends { id: string; slug?: string }>(
  store: InMemoryStore<T>,
  slugIndex: SlugIndex,
) {
  return {
    findAll: async () => Array.from(store.values()),
    findById: async (id: string) => store.get(id) ?? null,
    findBySlug: async (slug: string) => {
      const id = slugIndex.get(slug);
      return (id ? store.get(id) : null) ?? null;
    },
    create: async (entity: T) => {
      const withId = {
        ...entity,
        id: entity.id || crypto.randomUUID(),
      } as T;
      const slug =
        'slug' in withId &&
        typeof (withId as { slug?: string }).slug === 'string'
          ? (withId as { slug: string }).slug
          : shortenId(withId.id);
      (withId as { slug?: string }).slug = slug;
      store.set(withId.id, withId);
      slugIndex.set(slug, withId.id);
      return withId;
    },
    update: async (entity: T) => {
      const existing = store.get(entity.id);
      if (!existing) throw new Error(`Entity ${entity.id} not found`);
      const updated = { ...existing, ...entity } as T;
      store.set(entity.id, updated);
      if (
        'slug' in updated &&
        typeof (updated as { slug?: string }).slug === 'string'
      ) {
        slugIndex.set((updated as { slug: string }).slug, entity.id);
      }
      return updated;
    },
    delete: async (id: string) => {
      const entity = store.get(id);
      if (entity) {
        store.delete(id);
        if ('slug' in entity) {
          slugIndex.delete((entity as { slug: string }).slug);
        }
      }
      return true;
    },
    shortenId,
  };
}

export function createMockRepositories(): Repositories {
  const orgStore = new Map<string, Organization & { slug: string }>();
  const orgSlugIndex: SlugIndex = new Map();

  const projectStore = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      organizationId: string;
      [k: string]: unknown;
    }
  >();
  const projectSlugIndex: SlugIndex = new Map();

  const conversationStore = new Map<
    string,
    { id: string; slug: string; projectId: string; [k: string]: unknown }
  >();
  const conversationSlugIndex: SlugIndex = new Map();

  const notebookStore = new Map<
    string,
    { id: string; slug: string; projectId: string; [k: string]: unknown }
  >();
  const notebookSlugIndex: SlugIndex = new Map();

  const userStore = new Map<
    string,
    { id: string; username: string; [k: string]: unknown }
  >();
  const datasourceStore = new Map<
    string,
    {
      id: string;
      project_id?: string;
      projectId?: string;
      [k: string]: unknown;
    }
  >();
  const messageStore = new Map<string, unknown>();
  const usageStore = new Map<string, unknown>();

  const orgRepo = createInMemoryRepo(orgStore, orgSlugIndex);

  const organizationRepository = {
    ...orgRepo,
    search: async (q: string, opts?: RepositoryFindOptions) => {
      const all = await orgRepo.findAll();
      const filtered = q
        ? all.filter(
            (o) =>
              o.name.toLowerCase().includes(q.toLowerCase()) ||
              o.slug.toLowerCase().includes(q.toLowerCase()),
          )
        : all;
      const from = opts?.offset ?? 0;
      const to = opts?.limit != null ? from + opts.limit : filtered.length;
      return filtered.slice(from, to);
    },
    getBillingData: async (
      organizationId: string,
    ): Promise<OrganizationBillingData> => ({
      balance: 0,
      totalPurchased: 0,
      totalConsumed: 0,
      totalAllocated: 0,
      accountId: organizationId,
    }),
  };

  const projectRepo = createInMemoryRepo(projectStore, projectSlugIndex);
  const projectRepository = {
    ...projectRepo,
    findAllByOrganizationId: async (orgId: string) =>
      Array.from(projectStore.values()).filter(
        (p) => p.organizationId === orgId,
      ),
    search: async (
      _q: string,
      opts?: RepositoryFindOptions & { organizationId?: string },
    ) => {
      let items = Array.from(projectStore.values());
      if (opts?.organizationId) {
        items = items.filter((p) => p.organizationId === opts.organizationId);
      }
      const from = opts?.offset ?? 0;
      const to = opts?.limit != null ? from + opts.limit : items.length;
      return items.slice(from, to);
    },
  };

  const conversationRepo = createInMemoryRepo(
    conversationStore,
    conversationSlugIndex,
  );
  const conversationRepository = {
    ...conversationRepo,
    findByProjectId: async (projectId: string) =>
      Array.from(conversationStore.values()).filter(
        (c) => c.projectId === projectId,
      ),
    findByTaskId: async () => [],
  };

  const notebookRepo = createInMemoryRepo(notebookStore, notebookSlugIndex);
  const notebookRepository = {
    ...notebookRepo,
    findByProjectId: async (projectId: string) =>
      Array.from(notebookStore.values()).filter(
        (n) => n.projectId === projectId,
      ),
  };

  const userRepository = {
    findAll: async () => Array.from(userStore.values()),
    findById: async (id: string) => userStore.get(id) ?? null,
    findBySlug: async () => null,
    create: async (entity: {
      id: string;
      username: string;
      [k: string]: unknown;
    }) => {
      const withId = { ...entity, id: entity.id || crypto.randomUUID() };
      userStore.set(withId.id, withId);
      return withId;
    },
    update: async (entity: { id: string }) => {
      const existing = userStore.get(entity.id);
      if (!existing) throw new Error(`User ${entity.id} not found`);
      const updated = { ...existing, ...entity };
      userStore.set(entity.id, updated);
      return updated;
    },
    delete: async (id: string) => {
      userStore.delete(id);
      return true;
    },
    shortenId: (id: string) => id.slice(0, 8),
  };

  const datasourceRepository = {
    findAll: async () => Array.from(datasourceStore.values()),
    findById: async (id: string) => datasourceStore.get(id) ?? null,
    findBySlug: async () => null,
    findByProjectId: async (projectId: string) =>
      Array.from(datasourceStore.values()).filter(
        (d) => d.project_id === projectId || d.projectId === projectId,
      ),
    revealSecrets: async (config: Record<string, unknown>) => config,
    create: async (entity: { id: string; [k: string]: unknown }) => {
      const withId = { ...entity, id: entity.id || crypto.randomUUID() };
      datasourceStore.set(withId.id, withId);
      return withId;
    },
    update: async (entity: { id: string }) => {
      const existing = datasourceStore.get(entity.id);
      if (!existing) throw new Error(`Datasource ${entity.id} not found`);
      const updated = { ...existing, ...entity };
      datasourceStore.set(entity.id, updated);
      return updated;
    },
    delete: async (id: string) => {
      datasourceStore.delete(id);
      return true;
    },
    shortenId: (id: string) => id.slice(0, 8),
  };

  const messageRepository = {
    findAll: async () => Array.from(messageStore.values()),
    findById: async (id: string) => messageStore.get(id) ?? null,
    findBySlug: async () => null,
    create: async (entity: { id: string }) => {
      const withId = { ...entity, id: entity.id || crypto.randomUUID() };
      messageStore.set(withId.id, withId);
      return withId;
    },
    update: async (entity: { id: string }) => {
      const existing = messageStore.get(entity.id);
      if (!existing) throw new Error(`Message ${entity.id} not found`);
      const updated = { ...existing, ...entity };
      messageStore.set(entity.id, updated);
      return updated;
    },
    delete: async (id: string) => {
      messageStore.delete(id);
      return true;
    },
    shortenId: (id: string) => id.slice(0, 8),
  };

  const usageRepository = {
    findAll: async () => Array.from(usageStore.values()),
    findById: async (id: string) => usageStore.get(id) ?? null,
    findBySlug: async () => null,
    create: async (entity: { id: string }) => {
      const withId = { ...entity, id: entity.id || crypto.randomUUID() };
      usageStore.set(withId.id, withId);
      return withId;
    },
    update: async (entity: { id: string }) => {
      const existing = usageStore.get(entity.id);
      if (!existing) throw new Error(`Usage ${entity.id} not found`);
      const updated = { ...existing, ...entity };
      usageStore.set(entity.id, updated);
      return updated;
    },
    delete: async (id: string) => {
      usageStore.delete(id);
      return true;
    },
    shortenId: (id: string) => id.slice(0, 8),
  };

  const stubRepo = (_name: string) => ({
    findAll: async () => [],
    findById: async () => null,
    findBySlug: async () => null,
    create: async (entity: { id?: string }) => {
      const withId = { ...entity, id: entity.id || crypto.randomUUID() };
      return withId;
    },
    update: async (entity: { id: string }) => entity,
    delete: async () => true,
    shortenId: (id: string) => id.slice(0, 8),
  });

  const userTokenStore = new Map<string, UserToken>();

  const userTokenRepository: Repositories['userToken'] = {
    findAll: async () => {
      throw new Error(
        'findAll is not supported — user tokens must be listed per account.',
      );
    },
    findById: async (id: string) => userTokenStore.get(id) ?? null,
    findBySlug: async () => {
      throw new Error(
        'findBySlug is not supported — user tokens have no slug.',
      );
    },
    findByAccountId: async (accountId: string) =>
      Array.from(userTokenStore.values())
        .filter((row) => row.account_id === accountId)
        .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
    create: async (input: CreateUserTokenRow) => {
      const now = new Date().toISOString();
      const row: UserToken = {
        id: crypto.randomUUID(),
        account_id: input.account_id,
        token_name: input.token_name,
        scopes: input.scopes,
        expires_at: input.expires_at,
        revoked: false,
        revoked_at: null,
        created_at: now,
        updated_at: now,
        created_by: input.account_id,
        updated_by: input.account_id,
      };
      userTokenStore.set(row.id, row);
      return row;
    },
    revoke: async (id: string, accountId: string) => {
      const existing = userTokenStore.get(id);
      if (!existing) return null;
      if (existing.account_id !== accountId) return null;
      if (existing.revoked) return null;
      const updated: UserToken = {
        ...existing,
        revoked: true,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      userTokenStore.set(id, updated);
      return updated;
    },
    update: async () => {
      throw new Error(
        'update is not supported — use revoke for the one allowed state change.',
      );
    },
    delete: async () => {
      throw new Error(
        'delete is not supported — user tokens are soft-revoked, not deleted.',
      );
    },
    shortenId: (id: string) => id.slice(0, 8),
  };

  const jwtSigner: Repositories['jwtSigner'] = {
    sign: (payload, _options) => `mock.jwt.${payload.token_id}`,
  };

  const userPreferencesStore = new Map<string, UserPreferences>();

  const userPreferencesRepository: Repositories['userPreferences'] = {
    get: async (userId: string) => userPreferencesStore.get(userId) ?? null,
    patch: async (
      userId: string,
      patch: Partial<UserPreferencesPayload>,
    ): Promise<UserPreferences> => {
      const now = new Date().toISOString();
      const existing = userPreferencesStore.get(userId);
      const mergedPrefs = {
        ...(existing?.preferences ?? {}),
        ...(patch as Record<string, unknown>),
      } as UserPreferences['preferences'];
      const row: UserPreferences = {
        user_id: userId,
        preferences: mergedPrefs,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      userPreferencesStore.set(userId, row);
      return row;
    },
  };

  return {
    user: userRepository,
    organization: organizationRepository,
    project: projectRepository,
    datasource: datasourceRepository,
    integrationConnection: stubRepo(
      'integrationConnection',
    ) as Repositories['integrationConnection'],
    notebook: notebookRepository,
    conversation: conversationRepository,
    message: messageRepository,
    usage: usageRepository,
    order: stubRepo('order') as Repositories['order'],
    teamMember: stubRepo('teamMember') as Repositories['teamMember'],
    todo: stubRepo('todo') as Repositories['todo'],
    orderItem: stubRepo('orderItem') as Repositories['orderItem'],
    userQuota: stubRepo('userQuota') as Repositories['userQuota'],
    volumePricingTier: stubRepo(
      'volumePricingTier',
    ) as Repositories['volumePricingTier'],
    userToken: userTokenRepository,
    userPreferences: userPreferencesRepository,
    jwtSigner,
    node: stubRepo('node') as Repositories['node'],
    pool: stubRepo('pool') as Repositories['pool'],
    database: {
      findAll: async () => [],
      findByAccountId: async () => [],
      findById: async () => null,
      create: async (e) => e,
      update: async (e) => e,
      delete: async () => undefined,
    } as Repositories['database'],
    performanceProfile: {
      findPublicCatalog: async () => [],
      findByAccountId: async () => [],
      findById: async () => null,
    } as Repositories['performanceProfile'],
  };
}
