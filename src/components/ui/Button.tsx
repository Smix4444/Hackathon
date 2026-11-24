import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger'
type Size = 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold leading-none transition-colors duration-150 disabled:opacity-55 disabled:pointer-events-none'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-blue text-white hover:bg-blue-dark active:bg-blue-dark',
  secondary: 'border border-line bg-bg text-ink hover:bg-surface active:bg-blue-tint',
  quiet: 'text-blue hover:bg-blue-tint hover:text-blue-dark',
  danger: 'border border-danger bg-bg text-danger hover:bg-danger-tint',
}

const SIZES: Record<Size, string> = {
  md: 'min-h-11 px-5 text-base',
  lg: 'min-h-14 px-7 text-lg',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  block?: boolean
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  block = false,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      className={[BASE, VARIANTS[variant], SIZES[size], block ? 'w-full' : '', className].join(' ')}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}
