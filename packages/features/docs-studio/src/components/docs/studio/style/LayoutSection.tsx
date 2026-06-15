'use client';

import type { FlexAlign, FlexJustify } from '#/lib/block-schema';
import {
  WfField,
  WfFieldRow,
  WfGapControl,
  WfSegmented,
  WfSelect,
  WfStepper,
  WfCheckRow,
} from './WfControls';
import { StyleSection } from './StyleSection';

interface LayoutSectionProps {
  blockType: string;
  props: Record<string, unknown>;
  onPropsChange: (props: Record<string, unknown>) => void;
}

const ALIGN_GRID: { align: FlexAlign; justify: FlexJustify }[] = [
  { align: 'start', justify: 'start' },
  { align: 'start', justify: 'center' },
  { align: 'start', justify: 'end' },
  { align: 'center', justify: 'start' },
  { align: 'center', justify: 'center' },
  { align: 'center', justify: 'end' },
  { align: 'end', justify: 'start' },
  { align: 'end', justify: 'center' },
  { align: 'end', justify: 'end' },
];

export default function LayoutSection({
  blockType,
  props,
  onPropsChange,
}: LayoutSectionProps) {
  const setProp = (key: string, value: unknown) =>
    onPropsChange({ ...props, [key]: value });
  const showLayout =
    blockType === 'box' || blockType === 'grid' || blockType === 'section';
  const align = (props.align as FlexAlign) ?? 'stretch';
  const justify = (props.justify as FlexJustify) ?? 'start';
  const gap = (props.gap as number) ?? 0;
  const cols = (props.cols as number) ?? 2;
  const rows = (props.rows as number) ?? 1;

  if (!showLayout && blockType !== 'split' && blockType !== 'levels')
    return null;

  return (
    <StyleSection title="Layout">
      {blockType === 'grid' && (
        <WfFieldRow>
          <WfField label="Columns">
            <WfStepper
              value={cols}
              min={2}
              max={4}
              onChange={(v) => setProp('cols', v)}
            />
          </WfField>
          <WfField label="Rows">
            <WfStepper
              value={rows}
              min={1}
              max={4}
              onChange={(v) => setProp('rows', v)}
            />
          </WfField>
        </WfFieldRow>
      )}

      {(blockType === 'box' || blockType === 'grid') && (
        <>
          <WfField label="Align">
            <div className="wf-align-row">
              <div className="wf-align-matrix">
                {ALIGN_GRID.map(({ align: a, justify: j }) => {
                  const active =
                    align !== 'stretch' && align === a && justify === j;
                  return (
                    <button
                      key={`${a}-${j}`}
                      type="button"
                      className={`wf-align-dot${active ? ' active' : ''}`}
                      onClick={() =>
                        onPropsChange({ ...props, align: a, justify: j })
                      }
                    />
                  );
                })}
              </div>
              <div className="wf-align-selects">
                <WfSelect value={align} onChange={(v) => setProp('align', v)}>
                  <option value="start">Start</option>
                  <option value="center">Center</option>
                  <option value="end">End</option>
                  <option value="stretch">Stretch</option>
                </WfSelect>
                <WfSelect
                  value={justify}
                  onChange={(v) => setProp('justify', v)}
                >
                  <option value="start">Start</option>
                  <option value="center">Center</option>
                  <option value="end">End</option>
                  <option value="between">Space between</option>
                  <option value="around">Space around</option>
                </WfSelect>
              </div>
            </div>
          </WfField>

          <WfGapControl
            label="Gap"
            value={gap}
            onChange={(v) => setProp('gap', v || undefined)}
          />

          {blockType === 'grid' && (
            <>
              <WfGapControl
                label="Column gap"
                value={(props.colGap as number) ?? gap}
                onChange={(v) => setProp('colGap', v || undefined)}
              />
              <WfGapControl
                label="Row gap"
                value={(props.rowGap as number) ?? gap}
                onChange={(v) => setProp('rowGap', v || undefined)}
              />
            </>
          )}

          {blockType === 'box' && (
            <>
              <WfField label="Direction">
                <WfSegmented
                  options={['row', 'column'] as const}
                  value={(props.direction as 'row' | 'column') ?? 'column'}
                  onChange={(v) => setProp('direction', v)}
                />
              </WfField>
              <WfCheckRow
                label="Wrap"
                checked={!!props.wrap}
                onChange={(v) => setProp('wrap', v || undefined)}
              />
            </>
          )}
        </>
      )}

      {blockType === 'levels' && (
        <>
          <WfField
            label={`Tab — ${((props.tabWidth as number) ?? 38).toFixed(0)}mm`}
          >
            <input
              type="range"
              min="28"
              max="60"
              step="1"
              value={(props.tabWidth as number) ?? 38}
              onChange={(e) => setProp('tabWidth', parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: '#146ef5' }}
            />
          </WfField>
          {(
            ((props.colFlex as number[] | undefined) ?? [1, 1]) as number[]
          ).map((w, i, arr) => (
            <WfField key={i} label={`Column ${i + 1} — ${w.toFixed(2)}fr`}>
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.05"
                value={w}
                onChange={(e) => {
                  const next = [...arr];
                  next[i] = parseFloat(e.target.value);
                  setProp('colFlex', next);
                }}
                className="w-full"
                style={{ accentColor: '#146ef5' }}
              />
            </WfField>
          ))}
        </>
      )}

      {blockType === 'split' && (
        <>
          <WfField
            label={`Main — ${((props.mainFlex as number) ?? 1.75).toFixed(2)}`}
          >
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={(props.mainFlex as number) ?? 1.75}
              onChange={(e) => setProp('mainFlex', parseFloat(e.target.value))}
              className="w-full"
              style={{ accentColor: '#146ef5' }}
            />
          </WfField>
          <WfField
            label={`Rail — ${((props.railFlex as number) ?? 1).toFixed(2)}`}
          >
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={(props.railFlex as number) ?? 1}
              onChange={(e) => setProp('railFlex', parseFloat(e.target.value))}
              className="w-full"
              style={{ accentColor: '#146ef5' }}
            />
          </WfField>
          <WfCheckRow
            label="Rail on the left"
            checked={!!props.reverse}
            onChange={(v) => setProp('reverse', v || undefined)}
          />
        </>
      )}
    </StyleSection>
  );
}
