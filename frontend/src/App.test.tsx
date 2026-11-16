import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import App from './App'

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('renderiza el home con los cuatro juegos', () => {
    renderApp()

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText('League of Legends')).toBeInTheDocument()
    expect(screen.getByText('Valorant')).toBeInTheDocument()
    expect(screen.getByText('Counter-Strike 2')).toBeInTheDocument()
    expect(screen.getByText('Dota 2')).toBeInTheDocument()
  })

  it('muestra las acciones de sesión cuando no hay usuario', () => {
    renderApp()

    expect(screen.getByRole('link', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })
})
