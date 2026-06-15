import { Trans } from '@guepard/ui/trans';

/**
 * Full-page auth shell — true two-column layout.
 *
 * Desktop (≥ md): full-viewport 50/50 grid.
 *   Left  – card-coloured form column, content centred at max-w-[420px]
 *   Right – dark decorative panel with marketing copy
 *
 * Mobile (< md): right panel hidden, form fills the viewport.
 */
export function AuthLayoutShell({
  children,
  Logo,
}: React.PropsWithChildren<{
  Logo?: React.ComponentType;
}>) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* ── LEFT: Form column ──────────────────────────────────────── */}
      <div className="bg-card flex flex-col items-center justify-center px-8 py-16">
        <div className="animate-in fade-in slide-in-from-bottom-4 flex w-full max-w-[420px] flex-col gap-8 duration-500">
          {Logo && (
            <div className="flex justify-center">
              <Logo />
            </div>
          )}
          {children}
        </div>
      </div>

      {/* ── RIGHT: Decorative panel (desktop only) ────────────────── */}
      <div className="dark bg-secondary hidden flex-col items-start justify-center p-20 md:flex">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h2 className="text-primary text-[2rem] leading-[1.2] font-bold tracking-tight">
              <Trans i18nKey="auth:layoutHeading" />
            </h2>
            <p className="text-primary/50 text-sm leading-relaxed">
              <Trans i18nKey="auth:layoutSubheading" />
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {(
              [
                { color: 'bg-primary/70', key: 'auth:deployDatabaseReady' },
                { color: 'bg-[#FFCB51]', key: 'auth:testEnvironmentsRealData' },
                { color: 'bg-cyan-400', key: 'auth:branchDatabaseLikeCode' },
                { color: 'bg-primary/70', key: 'auth:resetSnapshotRollback' },
                { color: 'bg-[#FFCB51]', key: 'auth:multiDatabaseSupport' },
                { color: 'bg-cyan-400', key: 'auth:plugStackSimpleAPI' },
              ] as const
            ).map(({ color, key }) => (
              <li
                key={key}
                className="text-primary/60 flex items-start gap-3 text-sm leading-relaxed"
              >
                <span
                  className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
                />
                <Trans i18nKey={key} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
