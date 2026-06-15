import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Repositories,
  IUserPreferencesRepository,
} from '@qlm/domain/repositories';
import type {
  UserPreferences,
  UserPreferencesPayload,
} from '@qlm/domain/entities';

import {
  ShellAppProvider,
  type ShellAppContextValue,
} from '../src/context';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_SLUG = 'my-org';
const OTHER_ORG_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_A = '22222222-2222-4222-8222-222222222222';
const PROJECT_B = '33333333-3333-4333-8333-333333333333';

type PrefsRepoMock = {
  get: ReturnType<typeof vi.fn<(userId: string) => Promise<UserPreferences | null>>>;
  patch: ReturnType<
    typeof vi.fn<
      (
        userId: string,
        patch: Partial<UserPreferencesPayload>,
      ) => Promise<UserPreferences>
    >
  >;
};

// Capture the logger spies so tests can assert on them. The real
// `getLogger()` module in shared is async; mock it so we don't pull in
// pino.
const loggerSpies = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@qlm/shared/logger', () => ({
  getLogger: vi.fn(async () => loggerSpies),
}));

function makePrefsRepo(): PrefsRepoMock {
  return {
    get: vi.fn<(userId: string) => Promise<UserPreferences | null>>(),
    patch: vi.fn<
      (
        userId: string,
        patch: Partial<UserPreferencesPayload>,
      ) => Promise<UserPreferences>
    >(),
  };
}

function makeValue(
  prefs: PrefsRepoMock,
  overrides: Partial<ShellAppContextValue> = {},
): ShellAppContextValue {
  return {
    projectId: PROJECT_A,
    projectSlug: 'project-a',
    orgSlug: ORG_SLUG,
    organizationId: ORG_ID,
    currentUserId: USER_ID,
    repositories: {
      userPreferences: prefs as unknown as IUserPreferencesRepository,
    } as unknown as Repositories,
    runQuery: vi.fn(),
    testConnection: vi.fn(),
    getDatasourceMetadata: vi.fn(),
    ...overrides,
  };
}

function row(preferences: UserPreferencesPayload): UserPreferences {
  return {
    user_id: USER_ID,
    preferences,
    created_at: '2026-04-19T00:00:00.000Z',
    updated_at: '2026-04-19T00:00:00.000Z',
  };
}

async function flushAsync() {
  // The effect fires a chain of async awaits; let microtasks drain.
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
  }
}

describe('ShellAppProvider — on-enter last-project write', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('patches last_project_by_org once on mount', async () => {
    const prefs = makePrefsRepo();
    prefs.get.mockResolvedValue(null);
    prefs.patch.mockResolvedValue(
      row({ last_project_by_org: { [ORG_ID]: PROJECT_A } }),
    );

    render(
      <ShellAppProvider value={makeValue(prefs)}>
        <span>child</span>
      </ShellAppProvider>,
    );
    await flushAsync();

    expect(prefs.patch).toHaveBeenCalledTimes(1);
    expect(prefs.patch).toHaveBeenCalledWith(USER_ID, {
      last_project_by_org: { [ORG_ID]: PROJECT_A },
    });
  });

  it('preserves sibling orgs when writing the new entry', async () => {
    const prefs = makePrefsRepo();
    const OTHER_PROJECT = '44444444-4444-4444-8444-444444444444';
    prefs.get.mockResolvedValue(
      row({ last_project_by_org: { [OTHER_ORG_ID]: OTHER_PROJECT } }),
    );
    prefs.patch.mockResolvedValue(row({ last_project_by_org: {} }));

    render(
      <ShellAppProvider value={makeValue(prefs)}>
        <span>child</span>
      </ShellAppProvider>,
    );
    await flushAsync();

    expect(prefs.patch).toHaveBeenCalledWith(USER_ID, {
      last_project_by_org: {
        [OTHER_ORG_ID]: OTHER_PROJECT,
        [ORG_ID]: PROJECT_A,
      },
    });
  });

  it('fires again when projectId changes, not when an unchanged pair re-renders', async () => {
    const prefs = makePrefsRepo();
    prefs.get.mockResolvedValue(null);
    prefs.patch.mockResolvedValue(row({ last_project_by_org: {} }));

    const { rerender } = render(
      <ShellAppProvider value={makeValue(prefs)}>
        <span>child</span>
      </ShellAppProvider>,
    );
    await flushAsync();
    expect(prefs.patch).toHaveBeenCalledTimes(1);

    // Unchanged pair — no new write.
    rerender(
      <ShellAppProvider value={makeValue(prefs)}>
        <span>child</span>
      </ShellAppProvider>,
    );
    await flushAsync();
    expect(prefs.patch).toHaveBeenCalledTimes(1);

    // New projectId — one additional write.
    rerender(
      <ShellAppProvider
        value={makeValue(prefs, { projectId: PROJECT_B })}
      >
        <span>child</span>
      </ShellAppProvider>,
    );
    await flushAsync();
    expect(prefs.patch).toHaveBeenCalledTimes(2);
    expect(prefs.patch).toHaveBeenLastCalledWith(USER_ID, {
      last_project_by_org: { [ORG_ID]: PROJECT_B },
    });
  });

  it('skips the write when authReady is false', async () => {
    const prefs = makePrefsRepo();
    render(
      <ShellAppProvider value={makeValue(prefs, { authReady: false })}>
        <span>child</span>
      </ShellAppProvider>,
    );
    await flushAsync();
    expect(prefs.get).not.toHaveBeenCalled();
    expect(prefs.patch).not.toHaveBeenCalled();
  });

  it('skips the write when projectId or organizationId is empty', async () => {
    const prefs = makePrefsRepo();
    render(
      <ShellAppProvider
        value={makeValue(prefs, { projectId: '', organizationId: '' })}
      >
        <span>child</span>
      </ShellAppProvider>,
    );
    await flushAsync();
    expect(prefs.get).not.toHaveBeenCalled();
    expect(prefs.patch).not.toHaveBeenCalled();
  });

  it('logger.warn on patch failure; error does not surface', async () => {
    const prefs = makePrefsRepo();
    prefs.get.mockResolvedValue(null);
    prefs.patch.mockRejectedValue(new Error('boom'));

    render(
      <ShellAppProvider value={makeValue(prefs)}>
        <span>child</span>
      </ShellAppProvider>,
    );
    await flushAsync();

    expect(loggerSpies.warn).toHaveBeenCalledTimes(1);
    expect(loggerSpies.warn.mock.calls[0]![1]).toMatch(
      /Failed to record last-project preference/,
    );
  });
});
