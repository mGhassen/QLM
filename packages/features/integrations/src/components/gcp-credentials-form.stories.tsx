import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import {
  testResultPermissionDeniedFixture,
  testResultSuccessGcpFixture,
} from '../__fixtures__';
import { withIntegrationsProviders } from '../lib/story-helpers';
import { GcpCredentialsForm } from './gcp-credentials-form';

const VALID_SERVICE_ACCOUNT_JSON = JSON.stringify(
  {
    type: 'service_account',
    project_id: 'qlm-analytics-prod',
    private_key_id: '1234567890abcdef1234567890abcdef12345678',
    private_key:
      '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcw…\n-----END PRIVATE KEY-----\n',
    client_email:
      'qlm-runtime@qlm-analytics-prod.iam.gserviceaccount.com',
    client_id: '100000000000000000001',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  },
  null,
  2,
);

const meta: Meta<typeof GcpCredentialsForm> = {
  title: 'Features/Integrations/GCP credentials',
  component: GcpCredentialsForm,
  decorators: [withIntegrationsProviders],
  parameters: { layout: 'padded' },
  args: {
    onTest: fn(),
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof GcpCredentialsForm>;

export const Empty: Story = {
  name: 'Empty',
};

export const Filled: Story = {
  name: 'Filled (valid values, not yet tested)',
  args: {
    initialValues: {
      name: 'analytics',
      serviceAccountJson: VALID_SERVICE_ACCOUNT_JSON,
      defaultRegion: 'europe-west1',
    },
  },
};

export const Testing: Story = {
  name: 'Testing (spinner on the Test button)',
  args: {
    initialValues: {
      name: 'analytics',
      serviceAccountJson: VALID_SERVICE_ACCOUNT_JSON,
      defaultRegion: 'europe-west1',
    },
    isTesting: true,
  },
};

export const TestSuccess: Story = {
  name: 'Test success (green banner)',
  args: {
    initialValues: {
      name: 'analytics',
      serviceAccountJson: VALID_SERVICE_ACCOUNT_JSON,
      defaultRegion: 'europe-west1',
    },
    testResult: testResultSuccessGcpFixture,
  },
};

export const TestFailed: Story = {
  name: 'Test failed (permission_denied)',
  args: {
    initialValues: {
      name: 'analytics',
      serviceAccountJson: VALID_SERVICE_ACCOUNT_JSON,
      defaultRegion: 'europe-west1',
    },
    testResult: testResultPermissionDeniedFixture,
  },
};

export const ValidationError: Story = {
  name: 'Validation error (unparseable JSON)',
  args: {
    initialValues: {
      name: 'analytics',
      serviceAccountJson: '{ "this": "is", "not": "a service account"',
      defaultRegion: '',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'The form pre-fills with malformed JSON and an empty region. Click "Save" to paint validation errors for both fields.',
      },
    },
  },
};
