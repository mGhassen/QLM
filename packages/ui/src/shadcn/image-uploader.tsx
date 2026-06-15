'use client';

import * as React from 'react';

import { cn } from '../lib/utils';
import { Button } from './button';

export interface ImageUploaderProps extends React.PropsWithChildren<{
  value: string | null;
  onValueChange: (file: File | null) => void;
  className?: string;
}> {}

export function ImageUploader({
  value,
  onValueChange,
  className,
  children,
}: ImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onValueChange(file);
  };

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {value ? (
        <img
          src={value}
          alt="avatar"
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <div className="bg-muted h-16 w-16 rounded-full" />
      )}

      <div className="flex flex-col gap-2">
        {children}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            Upload
          </Button>
          {value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onValueChange(null)}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
