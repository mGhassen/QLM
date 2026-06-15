import type { Meta, StoryObj } from '@storybook/react';

import { PanelHeader } from './_panel-header';

/**
 * Storybook for `AssistantPanelBody` is currently disabled — the live body
 * requires `useShell()` (from `@qlm/shell-runtime`) and `<QueryClientProvider>`
 * to bootstrap the conversation and render `<QweryAgentUI>`. Setting up
 * the mock shell + query provider belongs to story 010
 * (`add-qwery-agent-tests`), which introduces the test harness package-wide.
 *
 * In the meantime this story renders the static `<PanelHeader />` so the
 * header chrome remains visually verifiable.
 */
const meta: Meta<typeof PanelHeader> = {
  title: 'Features/QweryAgent/AssistantPanelBody (header only)',
  component: PanelHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          height: '100vh',
          width: 360,
          borderLeft: '1px solid var(--border)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PanelHeader>;

export const HeaderOnly: Story = {};
