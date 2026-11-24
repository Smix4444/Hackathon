import type { InputHTMLAttributes } from 'react'

const BASE =
  'min-h-11 rounded-full border bg-bg px-4 text-base text-ink placeholder:text-ink-soft/70'

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const invalid = rest['aria-invalid'] ? 'border-danger' : 'border-line'
  return <input className={[BASE, invalid, className].join(' ')} {...rest} />
}
