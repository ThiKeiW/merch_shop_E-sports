import { Link, Route, Routes, useNavigate } from 'react-router-dom'

import { AdminPage, AdminProductFormPage, AdminProductsPage } from '@/features/admin'
import {
  LoginPage,
  RegisterPage,
  RequireAuth,
  RequireRole,
  useAuthStore,
  useSession,
} from '@/features/auth'
import { CartPage, selectCartCount, useCartStore } from '@/features/cart'
import { CatalogPage, HomePage, ProductDetailPage } from '@/features/catalog'
import { CheckoutPage } from '@/features/checkout'
import { OrderDetailPage, OrdersPage } from '@/features/orders'

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
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clear = useAuthStore((state) => state.clear)
  const cartCount = useCartStore(selectCartCount)
  useSession()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="font-display text-sm tracking-[0.2em] uppercase">
            Merch<span className="text-zinc-500">//</span>Shop
          </Link>
          <nav className="flex items-center gap-4 text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase sm:gap-6">
            <Link to="/catalogo" className="transition-colors hover:text-white">
              Catálogo
            </Link>
            <Link to="/carrito" className="flex items-center gap-1.5 transition-colors hover:text-white">
              Carrito
              {cartCount > 0 ? (
                <span className="bg-white px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  {cartCount}
                </span>
              ) : null}
            </Link>
            {user?.role === 'ADMIN' ? (
              <Link to="/admin" className="transition-colors hover:text-white">
                Admin
              </Link>
            ) : null}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden max-w-32 truncate text-zinc-300 normal-case sm:inline">
                  {user.displayName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clear()
                    navigate('/')
                  }}
                  className="border border-line px-3 py-1.5 text-[11px] tracking-[0.16em] transition-colors hover:border-zinc-500 hover:text-white"
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="transition-colors hover:text-white">
                  Ingresar
                </Link>
                <Link
                  to="/registro"
                  className="border border-line px-3 py-1.5 text-[11px] tracking-[0.16em] transition-colors hover:border-zinc-500 hover:text-white"
                >
                  Crear cuenta
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/producto/:slug" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/pedidos"
            element={
              <RequireAuth>
                <OrdersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/pedidos/:code"
            element={
              <RequireAuth>
                <OrderDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole role="ADMIN">
                <AdminPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/productos"
            element={
              <RequireRole role="ADMIN">
                <AdminProductsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/productos/nuevo"
            element={
              <RequireRole role="ADMIN">
                <AdminProductFormPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/productos/:id"
            element={
              <RequireRole role="ADMIN">
                <AdminProductFormPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Proyecto académico y demostrativo. Sin envíos ni cobros reales.</p>
          <p className="tracking-[0.18em] uppercase">Fase 5 — Carrito y pedidos</p>
        </div>
      </footer>
    </div>
  )
}
