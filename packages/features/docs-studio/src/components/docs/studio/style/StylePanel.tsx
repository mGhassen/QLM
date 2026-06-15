'use client';

import type { BlockNode, BlockType } from '#/lib/types';
import { BLOCK_LABELS } from '#/lib/block-fields';
import { getStylePanelSections } from '#/lib/block-style-config';
import {
  CONVERTIBLE_TEXT_TYPES,
  convertBlockType,
  isConvertibleTextBlock,
} from '#/lib/convert-block-type';
import ColorPicker from '../ColorPicker';
import BlockAppearancePanel from '../BlockAppearancePanel';
import BlockTypeStyleFields from './BlockTypeStyleFields';
import LayoutSection from './LayoutSection';
import SpacingBoxModel from './SpacingBoxModel';
import { StyleSection } from './StyleSection';
import {
  WfField,
  WfFieldRow,
  WfHint,
  WfInput,
  WfSelect,
  WfSegmented,
} from './WfControls';
import './studio-style-panel.css';

interface StylePanelProps {
  block: BlockNode;
  onPropsChange: (props: Record<string, unknown>) => void;
  onBlockChange?: (block: BlockNode) => void;
}

export default function StylePanel({
  block,
  onPropsChange,
  onBlockChange,
}: StylePanelProps) {
  const props = block.props ?? {};
  const setProp = (key: string, value: unknown) =>
    onPropsChange({ ...props, [key]: value });
  const label = BLOCK_LABELS[block.type] ?? block.type;
  const sections = getStylePanelSections(block.type);
  const show = (id: (typeof sections)[number]) => sections.includes(id);

  if (sections.length === 0) {
    return (
      <div className="wf-panel-sections">
        <div className="wf-empty-state">
          <p>No style controls for this block.</p>
          <p style={{ marginTop: 8 }}>Use Settings for content options.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-panel-sections">
      <div className="wf-selector-block">
        <div className="wf-selector-label">Style selector</div>
        <span className="wf-class-tag">{label}</span>
        <div className="text-muted-foreground mt-1 font-mono text-[10px]">
          {block.id}
        </div>
      </div>

      {isConvertibleTextBlock(block.type) && onBlockChange && (
        <StyleSection title="Block type">
          <WfField label="Type">
            <WfSelect
              value={block.type}
              onChange={(value) =>
                onBlockChange(convertBlockType(block, value as BlockType))
              }
            >
              {CONVERTIBLE_TEXT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BLOCK_LABELS[type] ?? type}
                </option>
              ))}
            </WfSelect>
          </WfField>
        </StyleSection>
      )}

      {show('typePreset') && (
        <StyleSection title="Block">
          <BlockTypeStyleFields
            block={block}
            onPropsChange={onPropsChange}
            onBlockChange={onBlockChange}
          />
        </StyleSection>
      )}

      {show('layout') && (
        <LayoutSection
          blockType={block.type}
          props={props}
          onPropsChange={onPropsChange}
        />
      )}

      {show('spacing') && (
        <StyleSection title="Spacing">
          <SpacingBoxModel props={props} onPropsChange={onPropsChange} />
        </StyleSection>
      )}

      {show('size') && (
        <StyleSection title="Size">
          <WfFieldRow>
            <WfField label="Width">
              <WfInput
                value={(props.width as string) ?? 'Auto'}
                placeholder="Auto"
                onChange={(v) =>
                  setProp('width', v === 'Auto' || !v ? undefined : v)
                }
              />
            </WfField>
            <WfField label="Height">
              <WfInput
                value={(props.height as string) ?? 'Auto'}
                placeholder="Auto"
                onChange={(v) =>
                  setProp('height', v === 'Auto' || !v ? undefined : v)
                }
              />
            </WfField>
          </WfFieldRow>
          <WfField label="Min dimensions">
            <WfFieldRow>
              <WfField label="Min W" labelTone="neutral">
                <WfInput
                  value={(props.minWidth as string) ?? '0'}
                  onChange={(v) =>
                    setProp('minWidth', v === '0' ? undefined : v)
                  }
                />
              </WfField>
              <WfField label="Min H" labelTone="neutral">
                <WfInput
                  value={(props.minHeight as string) ?? '0'}
                  onChange={(v) =>
                    setProp('minHeight', v === '0' ? undefined : v)
                  }
                />
              </WfField>
            </WfFieldRow>
          </WfField>
          <WfField label="Max dimensions">
            <WfFieldRow>
              <WfField label="Max W" labelTone="neutral">
                <WfInput
                  value={(props.maxWidth as string) ?? 'None'}
                  onChange={(v) =>
                    setProp('maxWidth', v === 'None' || !v ? undefined : v)
                  }
                />
              </WfField>
              <WfField label="Max H" labelTone="neutral">
                <WfInput
                  value={(props.maxHeight as string) ?? 'None'}
                  onChange={(v) =>
                    setProp('maxHeight', v === 'None' || !v ? undefined : v)
                  }
                />
              </WfField>
            </WfFieldRow>
          </WfField>
          <WfField label="Overflow">
            <div className="wf-icon-row">
              {(['visible', 'hidden', 'auto', 'scroll'] as const).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`wf-icon-toggle${(props.overflow ?? 'visible') === mode ? ' active' : ''}`}
                    onClick={() =>
                      setProp('overflow', mode === 'visible' ? undefined : mode)
                    }
                    title={mode}
                  >
                    {mode.slice(0, 1).toUpperCase()}
                  </button>
                ),
              )}
            </div>
          </WfField>
        </StyleSection>
      )}

      {show('position') && (
        <StyleSection title="Position" defaultOpen={false}>
          <WfField label="Position">
            <WfSelect
              value={(props.position as string) ?? 'static'}
              onChange={(v) =>
                setProp('position', v === 'static' ? undefined : v)
              }
            >
              <option value="static">Static</option>
              <option value="relative">Relative</option>
              <option value="absolute">Absolute</option>
            </WfSelect>
          </WfField>
          <WfFieldRow>
            <WfField label="X offset">
              <WfInput
                type="number"
                value={(props.translateX as number) ?? 0}
                onChange={(v) =>
                  setProp('translateX', parseFloat(v) || undefined)
                }
              />
            </WfField>
            <WfField label="Y offset">
              <WfInput
                type="number"
                value={(props.translateY as number) ?? 0}
                onChange={(v) =>
                  setProp('translateY', parseFloat(v) || undefined)
                }
              />
            </WfField>
          </WfFieldRow>
          <WfField label="Z-index">
            <WfInput
              type="number"
              value={(props.zIndex as number) ?? ''}
              onChange={(v) => setProp('zIndex', parseInt(v) || undefined)}
            />
          </WfField>
        </StyleSection>
      )}

      {show('typography') && (
        <StyleSection title="Typography" defaultOpen={false}>
          <ColorPicker
            variant="panel"
            label="Color"
            value={(props.color as string) ?? ''}
            onChange={(c) => setProp('color', c || undefined)}
          />
          <WfFieldRow>
            <WfField label="Size">
              <WfInput
                value={(props.fontSize as string) ?? ''}
                placeholder="—"
                onChange={(v) => setProp('fontSize', v || undefined)}
              />
            </WfField>
            <WfField label="Weight">
              <WfSelect
                value={String(props.fontWeight ?? '400')}
                onChange={(v) =>
                  setProp('fontWeight', v === '400' ? undefined : v)
                }
              >
                <option value="400">400 Normal</option>
                <option value="500">500 Medium</option>
                <option value="600">600 Semibold</option>
                <option value="700">700 Bold</option>
              </WfSelect>
            </WfField>
          </WfFieldRow>
          <WfField label="Align">
            <WfSegmented
              options={['left', 'center', 'right'] as const}
              value={(props.textAlign as 'left' | 'center' | 'right') ?? 'left'}
              onChange={(v) =>
                setProp('textAlign', v === 'left' ? undefined : v)
              }
            />
          </WfField>
        </StyleSection>
      )}

      {show('background') && (
        <StyleSection title="Background" defaultOpen={false}>
          <BlockAppearancePanel
            blockType={block.type}
            props={props}
            onPropsChange={onPropsChange}
            embedded
            variant="panel"
          />
          <WfFieldRow>
            <WfField label="Border">
              <ColorPicker
                variant="panel"
                value={(props.borderColor as string) ?? ''}
                onChange={(c) => setProp('borderColor', c || undefined)}
              />
            </WfField>
          </WfFieldRow>
          <WfField label="Border width">
            <WfInput
              value={(props.borderWidth as string) ?? ''}
              placeholder="1px"
              onChange={(v) => setProp('borderWidth', v || undefined)}
            />
          </WfField>
        </StyleSection>
      )}

      {block.type === 'card' && (
        <WfHint>
          Card padding follows the spacing box above (inner padding).
        </WfHint>
      )}
    </div>
  );
}
