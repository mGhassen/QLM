'use client';

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { resolvePaddingSides, type PaddingSides } from '#/lib/block-appearance';
import { trackPointerDrag } from '#/lib/fluid-drag';
import { pauseDocLayout, resumeDocLayout } from '#/lib/layout-pause';

const PX_PER_MM = 4;
const SNAP_MM = 0.5;
const MIN_MARGIN_MM = -24;
const MAX_MARGIN_MM = 24;
const MIN_PADDING_MM = -16;
const MAX_PADDING_MM = 16;

type Side = 'top' | 'bottom' | 'left' | 'right';
const SIDES: Side[] = ['top', 'bottom', 'left', 'right'];

function snapMm(v: number) {
  return Math.round(v / SNAP_MM) * SNAP_MM;
}

function clampMargin(v: number) {
  return Math.max(MIN_MARGIN_MM, Math.min(MAX_MARGIN_MM, snapMm(v)));
}

function clampPadding(v: number) {
  return Math.max(MIN_PADDING_MM, Math.min(MAX_PADDING_MM, snapMm(v)));
}

function commitValue(v: number) {
  return v === 0 ? undefined : v;
}

type Edge =
  | 'marginTop'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginRight'
  | 'paddingTop'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight';

type PaddingSide = keyof PaddingSides;

const EDGE_META: Record<
  Edge,
  { layer: 'margin' | 'padding'; side: Side; label: string }
> = {
  marginTop: { layer: 'margin', side: 'top', label: 'Margin top' },
  marginBottom: { layer: 'margin', side: 'bottom', label: 'Margin bottom' },
  marginLeft: { layer: 'margin', side: 'left', label: 'Margin left' },
  marginRight: { layer: 'margin', side: 'right', label: 'Margin right' },
  paddingTop: { layer: 'padding', side: 'top', label: 'Padding top' },
  paddingBottom: { layer: 'padding', side: 'bottom', label: 'Padding bottom' },
  paddingLeft: { layer: 'padding', side: 'left', label: 'Padding left' },
  paddingRight: { layer: 'padding', side: 'right', label: 'Padding right' },
};

function edgeSide(edge: Edge): Side {
  return EDGE_META[edge].side;
}

interface StudioSpacingHandlesProps {
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  padding?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  onCommit: (patch: {
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    padding?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
  }) => void;
}

function paddingPatch(
  side: PaddingSide,
  value: number,
  sides: PaddingSides,
  linked: boolean,
) {
  const v = commitValue(clampPadding(value));
  if (linked) {
    return {
      padding: undefined,
      paddingTop: v,
      paddingBottom: v,
      paddingLeft: v,
      paddingRight: v,
    };
  }
  return {
    padding: undefined,
    paddingTop: side === 'top' ? v : commitValue(sides.top),
    paddingBottom: side === 'bottom' ? v : commitValue(sides.bottom),
    paddingLeft: side === 'left' ? v : commitValue(sides.left),
    paddingRight: side === 'right' ? v : commitValue(sides.right),
  };
}

export default function StudioSpacingHandles({
  marginTop = 0,
  marginBottom = 0,
  marginLeft = 0,
  marginRight = 0,
  padding,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  onCommit,
}: StudioSpacingHandlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<Edge | null>(null);
  const [activeSide, setActiveSide] = useState<Side | null>(null);
  const [magnetPos, setMagnetPos] = useState(50);
  const [preview, setPreview] = useState<{
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    paddingSides?: PaddingSides;
  }>({});

  const basePadding = resolvePaddingSides({
    padding,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
  });
  const paddingSides = preview.paddingSides ?? basePadding;

  const startRef = useRef({
    x: 0,
    y: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingSides: basePadding,
  });
  const lastDeltaRef = useRef({ x: 0, y: 0 });

  const topVal = preview.marginTop ?? marginTop;
  const bottomVal = preview.marginBottom ?? marginBottom;
  const leftVal = preview.marginLeft ?? marginLeft;
  const rightVal = preview.marginRight ?? marginRight;
  const visibleSide = dragging ? edgeSide(dragging) : activeSide;

  function updateMagnet(side: Side, e: ReactPointerEvent) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pos =
      side === 'top' || side === 'bottom'
        ? ((e.clientX - rect.left) / rect.width) * 100
        : ((e.clientY - rect.top) / rect.height) * 100;
    setMagnetPos(Math.max(8, Math.min(92, pos)));
    setActiveSide(side);
  }

  function handleContainerLeave(e: ReactPointerEvent) {
    if (dragging) return;
    const next = e.relatedTarget as Node | null;
    if (containerRef.current?.contains(next)) return;
    setActiveSide(null);
  }

  function start(edge: Edge, e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActiveSide(edgeSide(edge));

    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      paddingSides: basePadding,
    };
    lastDeltaRef.current = { x: 0, y: 0 };
    setDragging(edge);
    pauseDocLayout();

    trackPointerDrag(e, {
      cursor: edge.startsWith('padding')
        ? edge.includes('Left') || edge.includes('Right')
          ? 'ew-resize'
          : 'ns-resize'
        : edge.includes('Left') || edge.includes('Right')
          ? 'ew-resize'
          : 'ns-resize',
      onMove(ev) {
        const dx = ev.clientX - startRef.current.x;
        const dy = ev.clientY - startRef.current.y;
        lastDeltaRef.current = { x: dx, y: dy };
        const deltaMmX = dx / PX_PER_MM;
        const deltaMmY = dy / PX_PER_MM;
        const sides = startRef.current.paddingSides;

        if (edge === 'marginTop') {
          setPreview({
            marginTop: clampMargin(startRef.current.marginTop + deltaMmY),
          });
        } else if (edge === 'marginBottom') {
          setPreview({
            marginBottom: clampMargin(startRef.current.marginBottom - deltaMmY),
          });
        } else if (edge === 'marginLeft') {
          setPreview({
            marginLeft: clampMargin(startRef.current.marginLeft + deltaMmX),
          });
        } else if (edge === 'marginRight') {
          setPreview({
            marginRight: clampMargin(startRef.current.marginRight - deltaMmX),
          });
        } else if (edge === 'paddingTop') {
          setPreview({
            paddingSides: { ...sides, top: clampPadding(sides.top + deltaMmY) },
          });
        } else if (edge === 'paddingBottom') {
          setPreview({
            paddingSides: {
              ...sides,
              bottom: clampPadding(sides.bottom - deltaMmY),
            },
          });
        } else if (edge === 'paddingLeft') {
          setPreview({
            paddingSides: {
              ...sides,
              left: clampPadding(sides.left + deltaMmX),
            },
          });
        } else if (edge === 'paddingRight') {
          setPreview({
            paddingSides: {
              ...sides,
              right: clampPadding(sides.right - deltaMmX),
            },
          });
        }
      },
      onEnd() {
        resumeDocLayout();
        const { x: dx, y: dy } = lastDeltaRef.current;
        const deltaMmX = dx / PX_PER_MM;
        const deltaMmY = dy / PX_PER_MM;
        const sides = startRef.current.paddingSides;
        setDragging(null);
        setPreview({});

        if (edge === 'marginTop') {
          onCommit({
            marginTop: commitValue(
              clampMargin(startRef.current.marginTop + deltaMmY),
            ),
          });
        } else if (edge === 'marginBottom') {
          onCommit({
            marginBottom: commitValue(
              clampMargin(startRef.current.marginBottom - deltaMmY),
            ),
          });
        } else if (edge === 'marginLeft') {
          onCommit({
            marginLeft: commitValue(
              clampMargin(startRef.current.marginLeft + deltaMmX),
            ),
          });
        } else if (edge === 'marginRight') {
          onCommit({
            marginRight: commitValue(
              clampMargin(startRef.current.marginRight - deltaMmX),
            ),
          });
        } else if (edge === 'paddingTop') {
          onCommit(paddingPatch('top', sides.top + deltaMmY, sides, false));
        } else if (edge === 'paddingBottom') {
          onCommit(
            paddingPatch('bottom', sides.bottom - deltaMmY, sides, false),
          );
        } else if (edge === 'paddingLeft') {
          onCommit(paddingPatch('left', sides.left + deltaMmX, sides, false));
        } else if (edge === 'paddingRight') {
          onCommit(paddingPatch('right', sides.right - deltaMmX, sides, false));
        }
      },
    });
  }

  function marginZoneStyle(value: number, side: Side): CSSProperties {
    const abs = Math.abs(value);
    if (abs === 0) return { display: 'none' };
    const negative = value < 0;
    if (side === 'top') {
      return negative
        ? { top: 0, left: 0, right: 0, height: `${abs}mm` }
        : { bottom: '100%', left: 0, right: 0, height: `${abs}mm` };
    }
    if (side === 'bottom') {
      return negative
        ? { bottom: 0, left: 0, right: 0, height: `${abs}mm` }
        : { top: '100%', left: 0, right: 0, height: `${abs}mm` };
    }
    if (side === 'left') {
      return negative
        ? { left: 0, top: 0, bottom: 0, width: `${abs}mm` }
        : { right: '100%', top: 0, bottom: 0, width: `${abs}mm` };
    }
    return negative
      ? { right: 0, top: 0, bottom: 0, width: `${abs}mm` }
      : { left: '100%', top: 0, bottom: 0, width: `${abs}mm` };
  }

  function paddingZoneStyle(value: number, side: Side): CSSProperties {
    const abs = Math.abs(value);
    if (abs === 0) return { display: 'none' };
    const negative = value < 0;
    if (side === 'top') {
      return negative
        ? { top: `-${abs}mm`, left: 0, right: 0, height: `${abs}mm` }
        : { top: 0, left: 0, right: 0, height: `${abs}mm` };
    }
    if (side === 'bottom') {
      return negative
        ? { bottom: `-${abs}mm`, left: 0, right: 0, height: `${abs}mm` }
        : { bottom: 0, left: 0, right: 0, height: `${abs}mm` };
    }
    if (side === 'left') {
      return negative
        ? { left: `-${abs}mm`, top: 0, bottom: 0, width: `${abs}mm` }
        : { left: 0, top: 0, bottom: 0, width: `${abs}mm` };
    }
    return negative
      ? { right: `-${abs}mm`, top: 0, bottom: 0, width: `${abs}mm` }
      : { right: 0, top: 0, bottom: 0, width: `${abs}mm` };
  }

  const controls: { edge: Edge; value: number }[] = [
    { edge: 'marginTop', value: topVal },
    { edge: 'marginBottom', value: bottomVal },
    { edge: 'marginLeft', value: leftVal },
    { edge: 'marginRight', value: rightVal },
    { edge: 'paddingTop', value: paddingSides.top },
    { edge: 'paddingBottom', value: paddingSides.bottom },
    { edge: 'paddingLeft', value: paddingSides.left },
    { edge: 'paddingRight', value: paddingSides.right },
  ];

  const visibleControls = visibleSide
    ? controls.filter(({ edge }) => edgeSide(edge) === visibleSide)
    : [];

  const sideValues =
    visibleSide === 'top'
      ? [
          { layer: 'margin', value: topVal },
          { layer: 'padding', value: paddingSides.top },
        ]
      : visibleSide === 'bottom'
        ? [
            { layer: 'margin', value: bottomVal },
            { layer: 'padding', value: paddingSides.bottom },
          ]
        : visibleSide === 'left'
          ? [
              { layer: 'margin', value: leftVal },
              { layer: 'padding', value: paddingSides.left },
            ]
          : visibleSide === 'right'
            ? [
                { layer: 'margin', value: rightVal },
                { layer: 'padding', value: paddingSides.right },
              ]
            : [];

  return (
    <div
      ref={containerRef}
      className={[
        'studio-spacing-handles',
        visibleSide ? 'magnet-active' : '',
        visibleSide ? `magnet-${visibleSide}` : '',
        dragging ? 'dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--magnet-pos': `${magnetPos}%` } as CSSProperties}
      onPointerLeave={handleContainerLeave}
      onClick={(e) => e.stopPropagation()}
    >
      {SIDES.map((side) => (
        <div
          key={side}
          className={`studio-spacing-edge-zone ${side}`}
          aria-hidden
          onPointerEnter={(e) => updateMagnet(side, e)}
          onPointerMove={(e) => updateMagnet(side, e)}
        />
      ))}

      {dragging && visibleSide && (
        <div className="studio-spacing-zones" aria-hidden>
          {sideValues.map(({ layer, value }) => (
            <div
              key={layer}
              className={`studio-spacing-zone ${layer}${value < 0 ? ' negative' : ''}`}
              style={
                layer === 'margin'
                  ? marginZoneStyle(value, visibleSide)
                  : paddingZoneStyle(value, visibleSide)
              }
            />
          ))}
        </div>
      )}

      {visibleControls.map(({ edge }) => {
        const meta = EDGE_META[edge];
        return (
          <button
            key={edge}
            type="button"
            className={`studio-spacing-handle ${meta.layer} ${meta.side}${dragging === edge ? ' active' : ''}`}
            title={`${meta.label} — drag to adjust`}
            aria-label={`Drag to adjust ${meta.label.toLowerCase()}`}
            onPointerDown={(e) => start(edge, e)}
          />
        );
      })}
    </div>
  );
}
