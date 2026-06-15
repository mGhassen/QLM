import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  SERVICE_RIGHT_PANEL_URL_TABS,
  type ServiceRightPanelUrlTab,
} from "../../environment-url-path";
import { SERVICE_RIGHT_PANEL_WIDTH_PX } from "./service-right-panel";
import { storyPostgresService } from "./story-fixtures";
import { ServiceTopologyServiceDock } from "./service-topology-service-dock";

const meta = {
  title: "Features/Environments/Components/Service topology service dock",
  component: ServiceTopologyServiceDock,
  tags: ["autodocs"],
  args: {
    service: storyPostgresService,
    onClose: fn(),
    subtitle: null as string | null | undefined,
    activePanelTab: SERVICE_RIGHT_PANEL_URL_TABS[0],
    onPanelTabChange: fn(),
  },
  argTypes: {
    service: { control: "object" },
    subtitle: { control: "text" },
    activePanelTab: {
      control: "inline-radio",
      options: [...SERVICE_RIGHT_PANEL_URL_TABS] satisfies ServiceRightPanelUrlTab[],
    },
    onClose: { table: { disable: true } },
    onPanelTabChange: { table: { disable: true } },
  },
  render: (args) => (
    <div
      className="border-border h-[560px] overflow-hidden rounded-lg border"
      style={{ width: SERVICE_RIGHT_PANEL_WIDTH_PX }}
    >
      <ServiceTopologyServiceDock {...args} />
    </div>
  ),
} satisfies Meta<typeof ServiceTopologyServiceDock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
