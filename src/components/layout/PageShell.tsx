import type { ReactNode } from 'react'

/** Skip-link plus de hoofdinhoud. Eén h1 per pagina. */
export function PageShell({ children, width = 'wide' }: { children: ReactNode; width?: 'wide' | 'narrow' }) {
  return (
    <>
      <a href="#inhoud" className="skip-link">
        Naar inhoud
      </a>
      <main
        id="inhoud"
        className={[
          'mx-auto w-full px-5 pb-20 pt-8 sm:px-8',
          width === 'narrow' ? 'max-w-[35rem]' : 'max-w-[76rem]',
        ].join(' ')}
      >
        {children}
      </main>
    </>
  )
}
