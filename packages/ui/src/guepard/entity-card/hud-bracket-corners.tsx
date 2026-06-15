import { cn } from '../../lib/utils';

const cornerClass = 'h-[14px] w-[14px]';
const cornerSize = 14;

/**
 * L-shaped HUD corners with strokes on the 0.5px grid so 1px strokes stay crisp.
 * Sits above the card fill, below content (`z-[1]` vs content `z-[2]`).
 */
export function HudBracketCorners({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'text-muted-foreground/40 pointer-events-none absolute -inset-px z-1 transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400',
        className,
      )}
    >
      {/* Top-left */}
      <div className={cn('absolute top-0 left-0', cornerClass)}>
        <svg
          aria-hidden
          className="block size-full overflow-visible"
          viewBox={`0 0 ${cornerSize} ${cornerSize}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d={`M 0.5 ${cornerSize - 0.5} L 0.5 0.5 L ${cornerSize - 0.5} 0.5`}
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
      {/* Top-right */}
      <div className={cn('absolute top-0 right-0', cornerClass)}>
        <svg
          aria-hidden
          className="block size-full overflow-visible"
          viewBox={`0 0 ${cornerSize} ${cornerSize}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d={`M ${cornerSize - 0.5} ${cornerSize - 0.5} L ${cornerSize - 0.5} 0.5 L 0.5 0.5`}
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
      {/* Bottom-left */}
      <div className={cn('absolute bottom-0 left-0', cornerClass)}>
        <svg
          aria-hidden
          className="block size-full overflow-visible"
          viewBox={`0 0 ${cornerSize} ${cornerSize}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d={`M 0.5 0.5 L 0.5 ${cornerSize - 0.5} L ${cornerSize - 0.5} ${cornerSize - 0.5}`}
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
      {/* Bottom-right */}
      <div className={cn('absolute right-0 bottom-0', cornerClass)}>
        <svg
          aria-hidden
          className="block size-full overflow-visible"
          viewBox={`0 0 ${cornerSize} ${cornerSize}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d={`M ${cornerSize - 0.5} 0.5 L ${cornerSize - 0.5} ${cornerSize - 0.5} L 0.5 ${cornerSize - 0.5}`}
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
    </div>
  );
}
