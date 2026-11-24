import type { ActivityEvent } from '../../domain/types'
import { formatTime } from '../../lib/time'
import { EmptyState } from '../ui/EmptyState'

/** S4: live activiteit. */
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <section aria-labelledby="feed-kop" className="flex flex-col gap-3">
      <h2 id="feed-kop" className="text-lg">
        Live
      </h2>
      {events.length === 0 ? (
        <EmptyState>Nog geen activiteit vandaag.</EmptyState>
      ) : (
        <ol aria-live="polite" className="flex flex-col gap-2">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3 text-sm">
              <time data-numeric dateTime={event.created_at} className="shrink-0 text-ink-soft">
                {formatTime(new Date(event.created_at))}
              </time>
              <span>{event.message}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
