import type { Meta, StoryObj } from '@storybook/react';

import { PanelHeader } from './_panel-header';

/**
 * Storybook for `AgentTabBody` is currently disabled — same rationale as the
 * sibling `AssistantPanelBody` story. The full-tab body needs `useShell()`
 * + `<QueryClientProvider>` + a valid conversation slug to render. Story 010
 * (`add-qwery-agent-tests`) sets up the mock shell harness; until then we
 * render the header in its tab-mode (no controls) so the visual stays
 * available.
 */
const meta: Meta<typeof PanelHeader> = {
  title: 'Features/QweryAgent/AgentTabBody (header only)',
  component: PanelHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    showOpenInTab: false,
    showClose: false,
  },
};

export default meta;

type Story = StoryObj<typeof PanelHeader>;

export const HeaderOnly: Story = {};
