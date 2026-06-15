import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { fn } from 'storybook/test';

import {
  ShellAppProvider,
  type ShellAppContextValue,
} from '@guepard/shell-runtime';

import { ProjectSettingsGeneralSection } from './general';

const projectSettingsEn = {
  sections: {
    general: {
      title: 'General',
      fields: { name: 'Name' },
      save: 'Save changes',
      saving: 'Saving…',
      saved: 'Project updated.',
      loading: 'Loading project…',
      error: {
        saveFailed: "Couldn't save project settings. Try again.",
        loadFailed: "Couldn't load this project.",
      },
    },
  },
};

const storybookI18n = i18next.createInstance();
storybookI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['project-settings'],
  defaultNS: 'project-settings',
  interpolation: { escapeValue: false },
  resources: { en: { 'project-settings': projectSettingsEn } },
} as Parameters<typeof storybookI18n.init>[0]);

type ProjectStub = {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  description: string;
  status: string;
};

const project: ProjectStub = {
  id: 'p-1',
  organizationId: 'o-1',
  slug: 'guepard-console',
  name: 'Rasm Console',
  description: '',
  status: 'active',
};

type ProjectRepoOverride = {
  findBySlug?: () => Promise<ProjectStub | null>;
  update?: (input: Partial<ProjectStub> & { id: string }) => Promise<ProjectStub>;
};

function makeShellValue(overrides: ProjectRepoOverride = {}): ShellAppContextValue {
  const asAny = (v: unknown) => v as never;
  return {
    projectId: project.id,
    projectSlug: project.slug,
    orgSlug: 'guepard',
    currentUserId: 'u-1',
    repositories: asAny({
      project: {
        findBySlug:
          overrides.findBySlug ?? (async () => project),
        findById: async () => project,
        update:
          overrides.update ??
          (async (input: Partial<ProjectStub> & { id: string }) => ({
            ...project,
            ...input,
          })),
      },
      userPreferences: {
        get: async () => null,
        patch: async () => ({
          user_id: 'u-1',
          preferences: { last_project_by_org: {} },
          created_at: null,
          updated_at: null,
        }),
      },
    }),
    runQuery: fn(),
    testConnection: fn(),
    getDatasourceMetadata: fn(),
  };
}

const meta: Meta<typeof ProjectSettingsGeneralSection> = {
  title: 'Apps/ProjectSettings/GeneralSection',
  component: ProjectSettingsGeneralSection,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof ProjectSettingsGeneralSection>;

function withProviders(shellValue: ShellAppContextValue) {
  return (Story: React.ComponentType) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <I18nextProvider i18n={storybookI18n}>
        <QueryClientProvider client={queryClient}>
          <ShellAppProvider value={shellValue}>
            <div className="w-[640px]">
              <Story />
            </div>
          </ShellAppProvider>
        </QueryClientProvider>
      </I18nextProvider>
    );
  };
}

export const Default: Story = {
  decorators: [withProviders(makeShellValue())],
};

export const Loading: Story = {
  decorators: [
    withProviders(
      makeShellValue({
        findBySlug: () => new Promise(() => undefined),
      }),
    ),
  ],
};

export const LoadError: Story = {
  decorators: [
    withProviders(
      makeShellValue({
        findBySlug: async () => {
          throw new Error('boom');
        },
      }),
    ),
  ],
};
