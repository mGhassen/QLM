import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { EligibilityChip } from './eligibility-chip';

const meta = {
  title: 'Features/Nodes/Components/Eligibility Chip',
  component: EligibilityChip,
  tags: ['autodocs'],
  args: {
    eligibility: 'eligible',
    onToggle: fn(),
  },
} satisfies Meta<typeof EligibilityChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Eligible: Story = {};

export const Ineligible: Story = {
  args: { eligibility: 'ineligible' },
};

export const Submitting: Story = {
  args: { eligibility: 'eligible', isSubmitting: true },
};

export const DisabledByDrain: Story = {
  name: 'Disabled (drain owns it)',
  args: { eligibility: 'ineligible', disabled: true },
};
