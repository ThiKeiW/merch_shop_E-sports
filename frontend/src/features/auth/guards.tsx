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
      <p className="mx-auto max-w-3xl px-6 py-24 text-center text-sm text-zinc-500">
        Verificando sesión…
      </p>
    )
  }

  if (user.role !== role) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="font-display text-6xl text-zinc-700">403</p>
        <h2 className="mt-4 text-xl font-semibold">No tienes permisos para ver esta sección</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Esta área está reservada para cuentas con rol {role}.
        </p>
      </section>
    )
  }

  return children
}
