"use client";

import type { BlockNode } from "#/lib/types";
import { BLOCK_VARIANTS } from "#/lib/block-fields";
import { levelsColumnCount, setLevelsColumnCount } from "#/lib/normalize-level";
import ColorPicker from "../ColorPicker";
import { WfCheckRow, WfField, WfSelect, WfStepper } from "./WfControls";

interface BlockTypeStyleFieldsProps {
  block: BlockNode;
  onPropsChange: (props: Record<string, unknown>) => void;
  onBlockChange?: (block: BlockNode) => void;
}

export default function BlockTypeStyleFields({
  block,
  onPropsChange,
  onBlockChange,
}: BlockTypeStyleFieldsProps) {
  const props = block.props ?? {};
  const setProp = (key: string, value: unknown) => onPropsChange({ ...props, [key]: value });
  const variants = BLOCK_VARIANTS[block.type];

  switch (block.type) {
    case "coverSubt":
      return (
        <>
          <ColorPicker
            variant="panel"
            label="First part"
            value={(props.subtitleUpColor as string) ?? "#ffcb51"}
            onChange={(c) => setProp("subtitleUpColor", c || undefined)}
          />
          <ColorPicker
            variant="panel"
            label="Middle"
            value={(props.subtitleOrColor as string) ?? "#b8b8b8"}
            onChange={(c) => setProp("subtitleOrColor", c || undefined)}
          />
          <ColorPicker
            variant="panel"
            label="Last part"
            value={(props.subtitleDownColor as string) ?? "#e8a8a2"}
            onChange={(c) => setProp("subtitleDownColor", c || undefined)}
          />
        </>
      );

    case "card":
    case "alert":
    case "rail":
      return (
        <>
          {variants && (
            <WfField label="Preset">
              <WfSelect
                value={(props.variant as string) ?? variants[0]}
                onChange={(v) => setProp("variant", v)}
              >
                {variants.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </WfSelect>
            </WfField>
          )}
          {block.type === "alert" && (
            <WfCheckRow label="Large text" checked={!!props.big} onChange={(v) => setProp("big", v)} />
          )}
        </>
      );

    case "figure":
      return (
        <WfCheckRow label="Wide layout" checked={!!props.wide} onChange={(v) => setProp("wide", v)} />
      );

    case "table":
      return (
        <WfField label="Preset">
          <WfSelect value={(props.variant as string) ?? ""} onChange={(v) => setProp("variant", v || undefined)}>
            <option value="">Default</option>
            <option value="text">Text</option>
            <option value="hl-last">Highlight last column</option>
          </WfSelect>
        </WfField>
      );

    case "subheading":
      return (
        <WfField label="Level">
          <WfSelect value={String(props.level ?? 2)} onChange={(v) => setProp("level", parseInt(v))}>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </WfSelect>
        </WfField>
      );

    case "levels":
      return (
        <>
          <WfField label="Column headers">
            <textarea
              className="wf-input"
              rows={3}
              value={((props.headers as string[] | undefined) ?? []).join("\n")}
              placeholder={"Column A\nColumn B"}
              onChange={(e) => {
                const headers = e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean);
                setProp("headers", headers.length > 0 ? headers : undefined);
              }}
            />
          </WfField>
          <WfCheckRow
            label="Highlight last header"
            checked={!!props.highlightLastHeader}
            onChange={(v) => setProp("highlightLastHeader", v)}
          />
          <WfField label="Columns">
            <WfStepper
              value={levelsColumnCount(block)}
              min={1}
              max={4}
              onChange={(count) => onBlockChange?.(setLevelsColumnCount(block, count))}
            />
          </WfField>
        </>
      );

    case "level":
      return (
        <>
          <WfField label="Level">
            <WfSelect value={String(props.level ?? 1)} onChange={(v) => setProp("level", parseInt(v))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  L{n}
                </option>
              ))}
            </WfSelect>
          </WfField>
          <WfCheckRow
            label="Highlight last column"
            checked={!!props.highlightCol}
            onChange={(v) => setProp("highlightCol", v)}
          />
        </>
      );

    case "lcard":
      return (
        <WfField label="Tier">
          <WfSelect value={String(props.tier ?? 1)} onChange={(v) => setProp("tier", parseInt(v))}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                Tier {n}
              </option>
            ))}
          </WfSelect>
        </WfField>
      );

    default:
      return null;
  }
}
