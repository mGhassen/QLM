import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { I18nextProvider } from 'react-i18next';

import type { UserToken } from '@qlm/domain/entities';

import { RevealTokenView } from './reveal-token-view';
import { storybookI18n } from './story-helpers';

const ROW: UserToken = {
  id: '11111111-1111-4111-9111-111111111111',
  account_id: '00000000-0000-4000-8000-000000000001',
  token_name: 'CI deploy token',
  scopes: ['read', 'write'],
  expires_at: 9_999_999_999,
  revoked: false,
  revoked_at: null,
  created_at: '2026-04-15T00:00:00.000Z',
  updated_at: '2026-04-15T00:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000000001',
  updated_by: '00000000-0000-4000-8000-000000000001',
};

const SHORT_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhYmMifQ.signature_here';

const LONG_JWT = `${SHORT_JWT}.${'x'.repeat(180)}`;

function StoryHost({ rawJwt }: { rawJwt: string }) {
  return (
    <I18nextProvider i18n={storybookI18n}>
      <div className="bg-background w-[760px] rounded border p-6">
        <RevealTokenView row={ROW} rawJwt={rawJwt} onClose={fn()} />
      </div>
    </I18nextProvider>
  );
}

const meta: Meta<typeof RevealTokenView> = {
  title: 'UserTokens/RevealTokenView',
  component: RevealTokenView,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof RevealTokenView>;

export const Initial: Story = {
  render: () => <StoryHost rawJwt={SHORT_JWT} />,
};

export const LongJwt: Story = {
  render: () => <StoryHost rawJwt={LONG_JWT} />,
};
