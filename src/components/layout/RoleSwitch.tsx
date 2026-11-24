import { Link, useLocation } from 'react-router'

import { setRole } from '../../storage/local'

/** Klant of salon: vervangt accounts (PLAN sectie 1, keuze 2). */
export function RoleSwitch({ slug }: { slug: string }) {
  const { pathname } = useLocation()
  const onSalon = pathname.startsWith('/dashboard')

  const base =
    'min-h-11 rounded-full px-4 py-2 font-bold leading-none transition-colors duration-150 flex items-center'
  const active = 'bg-blue text-white'
  const idle = 'text-ink-soft hover:bg-blue-tint hover:text-blue-dark'

  return (
    <nav aria-label="Rol" className="flex gap-1 rounded-full border border-line bg-surface p-1">
      <Link
        to={`/s/${slug}`}
        onClick={() => setRole('customer')}
        aria-current={onSalon ? undefined : 'page'}
        className={[base, onSalon ? idle : active].join(' ')}
      >
        Klant
      </Link>
      <Link
        to={`/dashboard/${slug}`}
        onClick={() => setRole('salon')}
        aria-current={onSalon ? 'page' : undefined}
        className={[base, onSalon ? active : idle].join(' ')}
      >
        Salon
      </Link>
    </nav>
  )
}
