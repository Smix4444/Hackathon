import type { SelectHTMLAttributes } from 'react'

const BASE = 'min-h-11 rounded-full border bg-bg px-4 text-base text-ink'

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const invalid = rest['aria-invalid'] ? 'border-danger' : 'border-line'
  return (
    <select className={[BASE, invalid, className].join(' ')} {...rest}>
      {children}
    </select>
  )
}
