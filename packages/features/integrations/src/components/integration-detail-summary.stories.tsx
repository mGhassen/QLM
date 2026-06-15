import { plainToClass } from 'class-transformer';

import type { Meta, StoryObj } from '@storybook/react';

import { IntegrationConnectionOutput } from '@guepard/domain/usecases';

import { awsIntegrationFixture } from '../__fixtures__';
import { withIntegrationsProviders } from '../lib/story-helpers';
import { IntegrationDetailSummary } from './integration-detail-summary';

const FIXED_NOW = new Date('2026-04-11T11:00:00.000Z');

const failedIntegration = plainToClass(IntegrationConnectionOutput, {
  ...awsIntegrationFixture,
  testStatus: 'failed',
  testIdentity: null,
  testError:
    'User arn:aws:iam::123456789012:user/readonly is not authorised to perform: sts:GetCallerIdentity',
  testedAt: new Date('2026-04-11T10:55:00.000Z'),
});

const untestedIntegration = plainToClass(IntegrationConnectionOutput, {
  ...awsIntegrationFixture,
  testStatus: 'untested',
  testIdentity: null,
  testError: null,
  testedAt: null,
});

const meta: Meta<typeof IntegrationDetailSummary> = {
  title: 'Features/Integrations/IntegrationDetailSummary',
  component: IntegrationDetailSummary,
  decorators: [withIntegrationsProviders],
  parameters: { layout: 'padded' },
  args: { now: FIXED_NOW, createdByName: 'Hani Chalouati' },
};

export default meta;
type Story = StoryObj<typeof IntegrationDetailSummary>;

export const Success: Story = {
  name: 'Success',
  args: { integration: awsIntegrationFixture },
};

export const Failed: Story = {
  name: 'Failed',
  args: { integration: failedIntegration },
};

export const Untested: Story = {
  name: 'Untested',
  args: { integration: untestedIntegration },
};
