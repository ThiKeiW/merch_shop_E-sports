import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { tokenStorage } from '@/shared/auth/tokenStorage'

import { LoginPage } from './LoginPage'
import { useAuthStore } from './store'

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Inicio</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function mockFetch(response: { ok: boolean; status: number; body: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
    }),
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, user: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra el mensaje de la API cuando las credenciales son inválidas', async () => {
    mockFetch({ ok: false, status: 401, body: { message: 'Email o contraseña incorrectos' } })
    const ui = userEvent.setup()
    renderLogin()

    await ui.type(screen.getByLabelText('Email'), 'cliente@merchshop.dev')
    await ui.type(screen.getByLabelText('Contraseña'), 'Cliente1234!')
    await ui.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos')
    expect(tokenStorage.get()).toBeNull()
  })

  it('guarda la sesión y navega al inicio tras un login correcto', async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: {
        token: 'jwt-login',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: {
          id: 2,
          email: 'cliente@merchshop.dev',
          displayName: 'Cliente Demo',
          role: 'CUSTOMER',
          active: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
      },
    })
    const ui = userEvent.setup()
    renderLogin()

    await ui.type(screen.getByLabelText('Email'), 'cliente@merchshop.dev')
    await ui.type(screen.getByLabelText('Contraseña'), 'Cliente1234!')
    await ui.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Inicio')).toBeInTheDocument()
    expect(tokenStorage.get()).toBe('jwt-login')
    expect(useAuthStore.getState().user?.role).toBe('CUSTOMER')
  })
})
