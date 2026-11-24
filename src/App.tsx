import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'

import { CustomerPage } from './pages/CustomerPage'
import { DashboardPage } from './pages/DashboardPage'
import { DemoPage } from './pages/DemoPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/s/:slug" element={<CustomerPage />} />
        <Route path="/dashboard/:slug" element={<DashboardPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster
        position="top-center"
        gap={10}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              'flex w-full items-start gap-3 rounded-full border border-line bg-bg px-5 py-3 text-base text-ink shadow-[0_8px_24px_rgba(14,27,61,0.10)]',
            title: 'font-bold',
            description: 'text-ink-soft',
          },
        }}
      />
    </BrowserRouter>
  )
}
