import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import {
  testResultInvalidCredentialsFixture,
  testResultSuccessAwsFixture,
} from '../__fixtures__';
import { withIntegrationsProviders } from '../lib/story-helpers';
import { AwsCredentialsForm } from './aws-credentials-form';

const meta: Meta<typeof AwsCredentialsForm> = {
  title: 'Features/Integrations/AWS credentials',
  component: AwsCredentialsForm,
  decorators: [withIntegrationsProviders],
  parameters: { layout: 'padded' },
  args: {
    onTest: fn(),
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AwsCredentialsForm>;

export const Empty: Story = {
  name: 'Empty',
};

export const Filled: Story = {
  name: 'Filled (valid values, not yet tested)',
  args: {
    initialValues: {
      name: 'prod-aws',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      sessionToken: '',
      defaultRegion: 'us-east-1',
    },
  },
};

export const Testing: Story = {
  name: 'Testing (spinner on the Test button)',
  args: {
    initialValues: {
      name: 'prod-aws',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      sessionToken: '',
      defaultRegion: 'us-east-1',
    },
    isTesting: true,
  },
};

export const TestSuccess: Story = {
  name: 'Test success (green banner)',
  args: {
    initialValues: {
      name: 'prod-aws',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      sessionToken: '',
      defaultRegion: 'us-east-1',
    },
    testResult: testResultSuccessAwsFixture,
  },
};

export const TestFailed: Story = {
  name: 'Test failed (invalid_credentials)',
  args: {
    initialValues: {
      name: 'prod-aws',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      sessionToken: '',
      defaultRegion: 'us-east-1',
    },
    testResult: testResultInvalidCredentialsFixture,
  },
};

export const ValidationError: Story = {
  name: 'Validation error (invalid access key format)',
  args: {
    initialValues: {
      name: 'prod-aws',
      accessKeyId: 'not-an-access-key',
      secretAccessKey: '',
      sessionToken: '',
      defaultRegion: '',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'The form pre-fills with an invalid access key id and empty required fields. Click "Save" to paint the validation errors for each failing field.',
      },
    },
  },
};
