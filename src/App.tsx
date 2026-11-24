import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'

import { CustomerPage } from './pages/CustomerPage'
import { DashboardPage } from './pages/DashboardPage'
import { DemoPage } from './pages/DemoPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'

// Voorbeeldpagina met nepdata: alleen tijdens ontwikkelen, niet in de productiebuild.
const PreviewPage = lazy(() => import('./pages/PreviewPage'))

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/s/:slug" element={<CustomerPage />} />
        <Route path="/dashboard/:slug" element={<DashboardPage />} />
        <Route path="/demo" element={<DemoPage />} />
        {import.meta.env.DEV ? (
          <Route
            path="/preview"
            element={
              <Suspense fallback={null}>
                <PreviewPage />
              </Suspense>
            }
          />
        ) : null}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster
        position="top-center"
        gap={10}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              'flex w-full items-start gap-3 rounded-full border border-ink bg-bg px-5 py-3 text-base text-ink',
            title: 'font-bold',
            description: 'text-ink-soft',
          },
        }}
      />
    </BrowserRouter>
  )
}
