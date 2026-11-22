import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import type { Role } from './types'
import { useAuthStore } from './store'

export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return (
      <p className="mx-auto max-w-3xl px-6 pt-32 pb-24 text-center text-sm text-white/45">
        Verificando sesión…
      </p>
    )
  }

  if (user.role !== role) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 pt-28 pb-20 text-center">
        <p className="display text-7xl text-white/15">403</p>
        <h2 className="display mt-4 text-2xl">No tienes permisos para ver esta sección</h2>
        <p className="mt-3 text-sm text-white/45">
          Esta área está reservada para cuentas con rol {role}.
        </p>
      </section>
    )
  }

  return children
}
