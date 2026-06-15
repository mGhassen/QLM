import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  EnvironmentsEnvironmentList,
  type DeploymentListGroupBy,
} from "./environments-environment-list";
import { DEFAULT_CANVAS_SERVICES } from "./environments-workspace-mock";

const defaultEnvOrder = ["production", "staging", "development"];

const logSelection = fn();

function EnvironmentListPlayground(props: {
  groupBy: DeploymentListGroupBy;
  activeEnvironment: string;
  selectedServiceId: string;
  environmentOrder: string[];
}) {
  const [groupBy, setGroupBy] = React.useState(props.groupBy);
  const [activeEnvironment, setActiveEnvironment] = React.useState(
    props.activeEnvironment,
  );
  const [selectedServiceId, setSelectedServiceId] = React.useState(
    props.selectedServiceId,
  );

  React.useEffect(() => {
    setGroupBy(props.groupBy);
  }, [props.groupBy]);
  React.useEffect(() => {
    setActiveEnvironment(props.activeEnvironment);
  }, [props.activeEnvironment]);
  React.useEffect(() => {
    setSelectedServiceId(props.selectedServiceId);
  }, [props.selectedServiceId]);

  return (
    <div className="bg-background min-h-[480px] rounded-lg border border-border">
      <EnvironmentsEnvironmentList
        services={DEFAULT_CANVAS_SERVICES}
        environmentOrder={props.environmentOrder}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        activeEnvironment={activeEnvironment}
        selectedServiceId={selectedServiceId === "" ? null : selectedServiceId}
        onSelect={(sel) => {
          logSelection(sel);
          if (sel.kind === "environment") setActiveEnvironment(sel.key);
          if (sel.kind === "service") setSelectedServiceId(sel.service.id);
        }}
      />
    </div>
  );
}

const meta = {
  title: "Features/Environments/Components/Deployment environment list",
  component: EnvironmentListPlayground,
  tags: ["autodocs"],
  args: {
    groupBy: "environment" as DeploymentListGroupBy,
    activeEnvironment: "production",
    selectedServiceId: "",
    environmentOrder: defaultEnvOrder,
  },
  argTypes: {
    groupBy: {
      control: "inline-radio",
      options: ["none", "environment", "type", "category"] satisfies DeploymentListGroupBy[],
    },
    activeEnvironment: { control: "text" },
    selectedServiceId: {
      control: "text",
      description: "Service id highlight (empty = none)",
    },
    environmentOrder: { control: "object" },
  },
} satisfies Meta<typeof EnvironmentListPlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const GroupByType: Story = {
  args: {
    groupBy: "type",
  },
};
