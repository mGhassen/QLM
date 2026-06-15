'use client';

import { Columns2, Rows2, Square } from 'lucide-react';
import type { AlignDimension } from '#/lib/block-align';
import { WfHint } from './style/WfControls';

interface MultiSelectAlignPanelProps {
  count: number;
  onAlign: (dimension: AlignDimension) => void;
}

export default function MultiSelectAlignPanel({
  count,
  onAlign,
}: MultiSelectAlignPanelProps) {
  return (
    <div className="wf-panel-sections">
      <div className="wf-selector-block">
        <div className="wf-selector-label">Selection</div>
        <span className="wf-class-tag">{count} blocks</span>
      </div>

      <div className="wf-section-body" style={{ paddingTop: 4 }}>
        <p className="wf-section-title" style={{ marginBottom: 8 }}>
          Match size
        </p>
        <div className="wf-align-actions">
          <button
            type="button"
            className="wf-align-btn"
            onClick={() => onAlign('width')}
          >
            <Columns2 size={14} />
            <span>Same width</span>
          </button>
          <button
            type="button"
            className="wf-align-btn"
            onClick={() => onAlign('height')}
          >
            <Rows2 size={14} />
            <span>Same height</span>
          </button>
          <button
            type="button"
            className="wf-align-btn"
            onClick={() => onAlign('both')}
          >
            <Square size={14} />
            <span>Same size</span>
          </button>
        </div>
        <WfHint>
          Sizes match the last selected block. Shift+click or ⌘+click to add to
          selection.
        </WfHint>
      </div>
    </div>
  );
}
