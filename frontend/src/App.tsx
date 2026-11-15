import { Link, Route, Routes } from 'react-router-dom'

import { HomePage } from '@/features/catalog'

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="font-display text-6xl text-zinc-700">404</p>
      <h2 className="mt-4 text-xl font-semibold">Esta página todavía no existe</h2>
      <Link to="/" className="mt-6 inline-block text-sm text-zinc-400 underline underline-offset-4">
        Volver al inicio
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="font-display text-sm tracking-[0.2em] uppercase">
            Merch<span className="text-zinc-500">//</span>Shop
          </Link>
          <nav className="flex items-center gap-6 text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase">
            <Link to="/" className="transition-colors hover:text-white">
              Catálogo
            </Link>
            <span className="cursor-not-allowed text-zinc-600" title="Disponible en la Fase 5">
              Carrito
            </span>
            <span className="cursor-not-allowed text-zinc-600" title="Disponible en la Fase 4">
              Admin
            </span>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Proyecto académico y demostrativo. Sin envíos ni cobros reales.</p>
          <p className="tracking-[0.18em] uppercase">Fase 1 · Base</p>
        </div>
      </footer>
    </div>
  )
}
