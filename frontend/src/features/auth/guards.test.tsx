import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { RequireRole } from './guards'
import { useAuthStore } from './store'
import type { Role, SessionUser } from './types'

function userWithRole(role: Role): SessionUser {
  return {
    id: 1,
    email: `${role.toLowerCase()}@merchshop.dev`,
    displayName: 'Usuario Test',
    role,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireRole role="ADMIN">
              <p>Panel de administración</p>
            </RequireRole>
          }
        />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null })
  })

  it('redirige al login cuando no hay sesión', () => {
    renderRoute()

    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
  })

  it('bloquea a un usuario sin el rol requerido', () => {
    useAuthStore.setState({ token: 'jwt', user: userWithRole('CUSTOMER') })

    renderRoute()

    expect(screen.getByText('No tienes permisos para ver esta sección')).toBeInTheDocument()
    expect(screen.queryByText('Panel de administración')).not.toBeInTheDocument()
  })

  it('permite el acceso al rol requerido', () => {
    useAuthStore.setState({ token: 'jwt', user: userWithRole('ADMIN') })

    renderRoute()

    expect(screen.getByText('Panel de administración')).toBeInTheDocument()
  })

  it('muestra un estado de verificación mientras carga el usuario', () => {
    useAuthStore.setState({ token: 'jwt', user: null })

    renderRoute()

    expect(screen.getByText('Verificando sesión…')).toBeInTheDocument()
  })
})
