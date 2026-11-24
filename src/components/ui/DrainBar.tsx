/**
 * Tijdbalk die leegloopt in zonnegeel. De cijfers staan ernaast in tekst,
 * dus de balk zelf is decoratief voor schermlezers.
 */
export function DrainBar({ fraction, tall = false }: { fraction: number; tall?: boolean }) {
  const width = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <div
      aria-hidden="true"
      className={[
        'w-full overflow-hidden rounded-full border border-offer bg-bg',
        tall ? 'h-4' : 'h-2.5',
      ].join(' ')}
    >
      <div
        className="h-full rounded-full bg-offer transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
