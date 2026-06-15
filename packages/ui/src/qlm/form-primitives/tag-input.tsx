import { useRef, useState } from 'react';
import { X } from 'lucide-react';

import { cn } from '@qlm/ui/utils';

export type TagInputProps = Readonly<{
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}>;

export function TagInput({
  tags,
  onChange,
  placeholder,
  suggestions,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const value = raw.trim().replace(/,$/, '').trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const toggleSuggestion = (tag: string) => {
    if (tags.includes(tag)) removeTag(tag);
    else onChange([...tags, tag]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
      return;
    }
    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(',')) addTag(val);
    else setInputValue(val);
  };

  const handleBlur = () => {
    if (inputValue.trim()) addTag(inputValue);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="border-border bg-muted/40 focus-within:border-primary flex min-h-10 w-full cursor-text flex-wrap items-center gap-2.5 rounded-none border px-3 py-2 transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-foreground text-background inline-flex items-center gap-2.5 rounded-none px-2.5 py-1.5 text-xs font-semibold"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="cursor-pointer transition-opacity hover:opacity-70"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : undefined}
          autoComplete="off"
          className="placeholder:text-muted-foreground/50 min-w-[80px] flex-1 bg-transparent text-sm font-semibold outline-none"
        />
      </div>

      {suggestions?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleSuggestion(tag)}
              className={cn(
                'cursor-pointer rounded-none border px-2 py-1 text-[10px] font-black tracking-widest uppercase transition-all',
                tags.includes(tag)
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground',
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
