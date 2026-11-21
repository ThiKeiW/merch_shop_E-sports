import { useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

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
import { PaymentPage } from '@/features/payment'

function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-4 pt-28 pb-20 text-center">
      <p className="display text-7xl text-white/15">404</p>
      <h1 className="display mt-5 text-2xl">Esta página todavía no existe</h1>
      <Link to="/" className="bevel bevel-p mt-8">
        Volver al inicio
      </Link>
    </section>
  )
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const clear = useAuthStore((state) => state.clear)
  const cartCount = useCartStore(selectCartCount)
  const [scrolled, setScrolled] = useState(false)
  useSession()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const authScreen = location.pathname === '/login' || location.pathname === '/registro'
  const solidNav = location.pathname !== '/' || scrolled

  return (
    <div className="flex min-h-dvh flex-col">
      {!authScreen ? (
        <header
          className={['nav fixed inset-x-0 top-0 z-50', solidNav ? 'solid' : ''].join(' ')}
        >
          <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 md:px-8">
            <Link to="/" className="display text-sm tracking-[0.18em]">
              Merch<span className="opacity-50">//</span>Shop
            </Link>

            <nav className="flex items-center gap-1 text-[0.72rem] font-semibold tracking-[0.16em] uppercase md:gap-5">
              <Link
                to="/catalogo"
                className="hidden px-2 py-2 text-white/80 transition-colors hover:text-white md:inline"
              >
                Catálogo
              </Link>

              <Link
                to="/carrito"
                aria-label="Carrito"
                className="relative p-2 text-white/80 transition-colors hover:text-white"
              >
                <svg aria-hidden className="ic h-5 w-5" viewBox="0 0 24 24">
                  <circle cx="9" cy="20" r="1.4" />
                  <circle cx="18" cy="20" r="1.4" />
                  <path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6" />
                </svg>
                <span className="absolute top-0 right-0 grid h-4 min-w-4 place-items-center bg-white px-1 text-[10px] font-bold text-black">
                  {cartCount}
                </span>
              </Link>

              {user ? (
                <Link
                  to="/pedidos"
                  className="hidden px-2 py-2 text-white/80 transition-colors hover:text-white md:inline"
                >
                  Mis pedidos
                </Link>
              ) : null}
              {user?.role === 'ADMIN' ? (
                <Link
                  to="/admin"
                  className="hidden px-2 py-2 text-white/80 transition-colors hover:text-white md:inline"
                >
                  Admin
                </Link>
              ) : null}

              {user ? (
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="hidden max-w-32 truncate font-bold text-white normal-case sm:inline">
                    {user.displayName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clear()
                      navigate('/')
                    }}
                    className="bevel bevel-sm"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-3">
                  <Link to="/login" className="px-2 py-2 text-white/80 transition-colors hover:text-white">
                    Ingresar
                  </Link>
                  <Link to="/registro" className="bevel bevel-sm">
                    Crear cuenta
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </header>
      ) : null}

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
            path="/pagar/:code"
            element={
              <RequireAuth>
                <PaymentPage />
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

      {!authScreen ? (
        <footer className="border-t border-white/10 bg-ink">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-4 py-8 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <p>Proyecto académico y demostrativo. Pagos en modo de prueba.</p>
            <p className="font-extrabold tracking-[0.18em] uppercase">Fase 7 — Rediseño de interfaces</p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
