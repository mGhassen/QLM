'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { CheckCircle2Icon, X } from 'lucide-react';
import { Button } from '../../../shadcn/button';
import { Input } from '../../../shadcn/input';
import { Label } from '../../../shadcn/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../shadcn/popover';
import { cn } from '../../../lib/utils';

export interface ChartColorEditorProps {
  colors: string[];
  onChange: (colors: string[]) => void;
  maxColors?: number;
  className?: string;
}

/**
 * Validates if a string is a valid hex color
 */
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

function hexForPicker(color: string): string {
  if (!isValidHexColor(color)) {
    return '#8884d8';
  }
  if (color.length === 4) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return color;
}

/**
 * Color customization component for charts
 * Allows users to edit chart colors in real-time with a user-friendly interface
 */
export function ChartColorEditor({
  colors,
  onChange,
  maxColors,
  className,
}: ChartColorEditorProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Determine the actual number of colors to show
  const colorCount = maxColors !== undefined ? maxColors : colors.length;

  // Compute display colors (trimmed and padded if needed)
  const computeDisplayColors = useCallback(
    (colorArray: string[]) => {
      const limited = colorArray.slice(0, colorCount);
      if (limited.length < colorCount) {
        const defaultColors = [
          '#8884d8',
          '#82ca9d',
          '#ffc658',
          '#ff7c7c',
          '#8dd1e1',
        ];
        return [...limited, ...defaultColors.slice(limited.length, colorCount)];
      }
      return limited;
    },
    [colorCount],
  );

  const [localColors, setLocalColors] = useState<string[]>(() =>
    computeDisplayColors(colors),
  );
  const prevColorsStrRef = useRef<string>('');

  // Sync local colors when prop changes, but only if values actually changed
  useEffect(() => {
    const displayColors = computeDisplayColors(colors);
    const displayColorsStr = JSON.stringify(displayColors);

    // Only update if the display colors actually changed
    if (prevColorsStrRef.current !== displayColorsStr) {
      prevColorsStrRef.current = displayColorsStr;
      // Use queueMicrotask to avoid setState in effect
      queueMicrotask(() => {
        setLocalColors((prev: string[]) => {
          const prevStr = JSON.stringify(prev);
          if (prevStr === displayColorsStr) {
            return prev; // No change needed
          }
          return displayColors;
        });
      });
    }
  }, [colors, computeDisplayColors]);

  const handleColorChange = (index: number, newColor: string) => {
    setLocalColors((prev: string[]) => {
      const updated = [...prev];
      updated[index] = newColor;
      const trimmed = updated.slice(0, colorCount);
      // Update the ref to prevent useEffect from re-triggering
      prevColorsStrRef.current = JSON.stringify(trimmed);
      // Call onChange with trimmed colors
      onChange(trimmed);
      return updated;
    });
  };

  const handleHexInputChange = (index: number, value: string) => {
    // Allow typing and update when valid
    if (value.startsWith('#') || value === '') {
      setLocalColors((prev: string[]) => {
        const updated = [...prev];
        updated[index] = value;

        // If it's a valid hex color, update immediately
        if (isValidHexColor(value)) {
          const trimmed = updated.slice(0, colorCount);
          prevColorsStrRef.current = JSON.stringify(trimmed);
          onChange(trimmed);
        }
        return updated;
      });
    }
  };

  const handleHexInputBlur = (index: number, value: string) => {
    setLocalColors((prev: string[]) => {
      // On blur, ensure we have a valid color
      if (!isValidHexColor(value)) {
        // Reset to previous valid color from props
        const updated = [...prev];
        updated[index] = colors[index] || '#8884d8';
        const trimmed = updated.slice(0, colorCount);
        prevColorsStrRef.current = JSON.stringify(trimmed);
        onChange(trimmed);
        return updated;
      } else if (value !== prev[index]) {
        // Only update if value actually changed
        const trimmed = prev.slice(0, colorCount);
        prevColorsStrRef.current = JSON.stringify(trimmed);
        onChange(trimmed);
      }
      return prev;
    });
  };

  const completedCount = localColors
    .slice(0, colorCount)
    .filter((c) => isValidHexColor(c)).length;

  const allValid =
    colorCount > 0 && completedCount === Math.max(1, Math.min(colorCount, 999));

  return (
    <div
      className={cn('flex w-full items-center justify-end gap-3', className)}
    >
      <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase">
        {allValid ? (
          <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : null}
        <span>
          Colors {Math.min(completedCount, colorCount)}/{colorCount}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {localColors.slice(0, colorCount).map((color, index) => (
          <Popover
            key={index}
            open={openIndex === index}
            onOpenChange={(nextOpen) => {
              setOpenIndex(nextOpen ? index : null);
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Edit color ${index + 1}`}
                className={cn(
                  'border-border hover:border-border/80 focus-visible:ring-ring inline-flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  openIndex === index && 'ring-ring ring-2 ring-offset-2',
                )}
                style={{ backgroundColor: hexForPicker(color) }}
              />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="border-border bg-popover w-80 p-3 shadow-xl"
              onPointerDownCapture={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="border-border h-4 w-4 rounded-sm border"
                    style={{ backgroundColor: hexForPicker(color) }}
                    aria-hidden
                  />
                  <div className="text-sm font-semibold">
                    {colorCount === 1 ? 'Color' : `Color ${index + 1}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-7 w-7 rounded"
                  onClick={() => setOpenIndex(null)}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="relative isolate overflow-hidden rounded-md">
                  <HexColorPicker
                    className="h-36! w-full! rounded-md"
                    color={hexForPicker(color)}
                    onChange={(next) => handleColorChange(index, next)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label
                    htmlFor={`chart-color-${index}`}
                    className="text-xs font-medium"
                  >
                    Hex
                  </Label>
                  <Input
                    id={`chart-color-${index}`}
                    type="text"
                    value={color}
                    onChange={(e) =>
                      handleHexInputChange(index, e.target.value)
                    }
                    onBlur={(e) => handleHexInputBlur(index, e.target.value)}
                    className="h-9 font-mono text-xs"
                    placeholder="#8884d8"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </div>
  );
}
