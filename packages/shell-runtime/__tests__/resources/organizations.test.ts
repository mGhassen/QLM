import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IOrganizationRepository,
  IProjectRepository,
} from '@qlm/domain/repositories';

import {
  createOrganizationsResource,
  type LastProjectResolver,
} from '../../src/resources/organizations';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_LAST = '22222222-2222-4222-8222-222222222222';
const PROJECT_FIRST = '33333333-3333-4333-8333-333333333333';

type ProjectRow = { id: string; slug: string; organizationId: string };

class StubOrgRepo extends IOrganizationRepository {
  // `switchTo` doesn't touch the org repository directly; stub the abstract
  // surface so `new StubOrgRepo()` compiles.
  findAll() {
    throw new Error('not implemented');
  }
  findById() {
    throw new Error('not implemented');
  }
  findBySlug() {
    throw new Error('not implemented');
  }
  create() {
    throw new Error('not implemented');
  }
  update() {
    throw new Error('not implemented');
  }
  delete() {
    throw new Error('not implemented');
  }
  search() {
    throw new Error('not implemented');
  }
  getBillingData() {
    throw new Error('not implemented');
  }
}

class StubProjectRepo extends IProjectRepository {
  public findByIdMock = vi.fn<(id: string) => Promise<ProjectRow | null>>();
  public findAllByOrganizationIdMock = vi.fn<
    (orgId: string) => Promise<ProjectRow[]>
  >();

  findById(id: string) {
    return this.findByIdMock(id) as never;
  }
  findAllByOrganizationId(orgId: string) {
    return this.findAllByOrganizationIdMock(orgId) as never;
  }
  findBySlug() {
    throw new Error('not implemented');
  }
  findAll() {
    throw new Error('not implemented');
  }
  create() {
    throw new Error('not implemented');
  }
  update() {
    throw new Error('not implemented');
  }
  delete() {
    throw new Error('not implemented');
  }
  search() {
    throw new Error('not implemented');
  }
}

function makeResource() {
  const orgRepo = new StubOrgRepo();
  const projectRepo = new StubProjectRepo();
  const queryClient = new QueryClient();
  const lastProjectResolver: LastProjectResolver = {
    getLastProject: vi.fn<(orgId: string) => Promise<string | null>>(),
  };
  const resource = createOrganizationsResource(
    orgRepo,
    queryClient,
    projectRepo,
    lastProjectResolver,
  );
  return { orgRepo, projectRepo, lastProjectResolver, resource };
}

describe('createOrganizationsResource.switchTo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the slug of the user\'s last project for the org', async () => {
    const { projectRepo, lastProjectResolver, resource } = makeResource();
    vi.mocked(lastProjectResolver.getLastProject).mockResolvedValue(
      PROJECT_LAST,
    );
    projectRepo.findByIdMock.mockResolvedValue({
      id: PROJECT_LAST,
      slug: 'my-last-project',
      organizationId: ORG_ID,
    });

    const result = await resource.switchTo(ORG_ID);
    expect(result).toEqual({ slug: 'my-last-project' });
    expect(projectRepo.findByIdMock).toHaveBeenCalledWith(PROJECT_LAST);
    // Fallback list must not be hit when the last-project lookup succeeds.
    expect(projectRepo.findAllByOrganizationIdMock).not.toHaveBeenCalled();
  });

  it("falls back to the org's first project when no last-project is stored", async () => {
    const { projectRepo, lastProjectResolver, resource } = makeResource();
    vi.mocked(lastProjectResolver.getLastProject).mockResolvedValue(null);
    projectRepo.findAllByOrganizationIdMock.mockResolvedValue([
      { id: PROJECT_FIRST, slug: 'first-project', organizationId: ORG_ID },
      { id: PROJECT_LAST, slug: 'second-project', organizationId: ORG_ID },
    ]);

    const result = await resource.switchTo(ORG_ID);
    expect(result).toEqual({ slug: 'first-project' });
  });

  it("falls back to list when the stored project id no longer exists", async () => {
    const { projectRepo, lastProjectResolver, resource } = makeResource();
    vi.mocked(lastProjectResolver.getLastProject).mockResolvedValue(
      PROJECT_LAST,
    );
    projectRepo.findByIdMock.mockResolvedValue(null);
    projectRepo.findAllByOrganizationIdMock.mockResolvedValue([
      { id: PROJECT_FIRST, slug: 'first-project', organizationId: ORG_ID },
    ]);

    const result = await resource.switchTo(ORG_ID);
    expect(result).toEqual({ slug: 'first-project' });
  });

  it('throws when the org has no projects', async () => {
    const { projectRepo, lastProjectResolver, resource } = makeResource();
    vi.mocked(lastProjectResolver.getLastProject).mockResolvedValue(null);
    projectRepo.findAllByOrganizationIdMock.mockResolvedValue([]);

    await expect(resource.switchTo(ORG_ID)).rejects.toThrow(/no projects/);
  });
});
