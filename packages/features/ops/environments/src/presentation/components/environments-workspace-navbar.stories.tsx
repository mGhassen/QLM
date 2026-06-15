import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { EnvironmentsWorkspaceNavbar } from "./environments-workspace-navbar";

const meta = {
  title: "Features/Environments/Components/Workspace navbar",
  component: EnvironmentsWorkspaceNavbar,
  tags: ["autodocs"],
  args: {
    orgName: "acme",
    projectName: "api",
    environments: ["production", "staging", "development"],
    activeEnvironment: "production",
    onEnvironmentChange: fn(),
    onOpenCmdk: fn(),
    onProjectSettings: fn(),
    onOrgSettings: fn(),
  },
  argTypes: {
    orgName: { control: "text" },
    projectName: { control: "text" },
    environments: { control: "object" },
    activeEnvironment: { control: "text" },
    onEnvironmentChange: { table: { disable: true } },
    onOpenCmdk: { table: { disable: true } },
    onProjectSettings: { table: { disable: true } },
    onOrgSettings: { table: { disable: true } },
  },
} satisfies Meta<typeof EnvironmentsWorkspaceNavbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
