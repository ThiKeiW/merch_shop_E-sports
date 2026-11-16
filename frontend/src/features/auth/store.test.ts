import { beforeEach, describe, expect, it } from 'vitest'

import { tokenStorage } from '@/shared/auth/tokenStorage'

import { useAuthStore } from './store'
import type { SessionUser } from './types'

const user: SessionUser = {
  id: 5,
  email: 'cliente@merchshop.dev',
  displayName: 'Cliente Demo',
  role: 'CUSTOMER',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null })
  })

  it('guarda el token y el usuario al iniciar sesión', () => {
    useAuthStore.getState().setSession({ token: 'jwt-123', tokenType: 'Bearer', expiresIn: 3600, user })

    expect(tokenStorage.get()).toBe('jwt-123')
    expect(useAuthStore.getState().token).toBe('jwt-123')
    expect(useAuthStore.getState().user?.email).toBe('cliente@merchshop.dev')
  })

  it('limpia token, usuario y almacenamiento al cerrar sesión', () => {
    useAuthStore.getState().setSession({ token: 'jwt-123', tokenType: 'Bearer', expiresIn: 3600, user })

    useAuthStore.getState().clear()

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(tokenStorage.get()).toBeNull()
  })

  it('actualiza el usuario sin tocar el token', () => {
    useAuthStore.setState({ token: 'jwt-123' })

    useAuthStore.getState().setUser({ ...user, displayName: 'Nuevo Nombre' })

    expect(useAuthStore.getState().token).toBe('jwt-123')
    expect(useAuthStore.getState().user?.displayName).toBe('Nuevo Nombre')
  })
})
