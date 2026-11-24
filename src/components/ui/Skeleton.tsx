export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={['animate-pulse rounded-block bg-surface', className].join(' ')} />
}

export function SkeletonAgenda() {
  return (
    <div className="flex flex-col gap-3">
      <span className="sr-only">De agenda wordt geladen.</span>
      <Skeleton className="h-16" />
      <Skeleton className="h-24" />
      <Skeleton className="h-16" />
      <Skeleton className="h-20" />
    </div>
  )
}
