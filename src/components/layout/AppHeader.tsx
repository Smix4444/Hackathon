import { Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import type { SyncMode } from '../../hooks/useRealtime'
import { RoleSwitch } from './RoleSwitch'
import { SyncIndicator } from './SyncIndicator'
import { Wordmark } from './Wordmark'

export function AppHeader({
  slug,
  salonName,
  mode,
  onOpenSettings,
  extra,
}: {
  slug?: string
  salonName?: string
  mode?: SyncMode
  onOpenSettings?: () => void
  extra?: ReactNode
}) {
  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex w-full max-w-[76rem] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
        <Link to="/" className="rounded-full">
          <Wordmark />
        </Link>
        {salonName ? (
          <p className="text-ink-soft">
            <span className="sr-only">Salon: </span>
            {salonName}
          </p>
        ) : null}
        <div className="ml-auto flex items-center gap-4">
          {mode ? <SyncIndicator mode={mode} /> : null}
          {extra}
          {slug ? <RoleSwitch slug={slug} /> : null}
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex size-11 items-center justify-center rounded-full border border-line text-ink-soft transition-colors duration-150 hover:bg-surface hover:text-ink"
            >
              <Settings aria-hidden="true" className="size-5" />
              <span className="sr-only">Instellingen</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
