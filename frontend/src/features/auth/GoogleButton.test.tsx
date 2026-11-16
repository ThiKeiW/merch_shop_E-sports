import { act, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GoogleButton } from './GoogleButton'
import { isGoogleEnabled } from './googleConfig'

describe('GoogleButton', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('no renderiza nada si falta VITE_GOOGLE_CLIENT_ID', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')

    expect(isGoogleEnabled()).toBe(false)

    const { container } = render(<GoogleButton onCredential={() => {}} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('inicializa Google Identity Services y entrega el credential', async () => {
    const initialize = vi.fn()
    const renderButton = vi.fn()

    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com')
    vi.stubGlobal('google', { accounts: { id: { initialize, renderButton } } })

    const onCredential = vi.fn()
    render(<GoogleButton onCredential={onCredential} />)

    await waitFor(() =>
      expect(initialize).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: 'test-client.apps.googleusercontent.com' }),
      ),
    )
    expect(renderButton).toHaveBeenCalled()

    const callback = initialize.mock.calls[0][0].callback as (response: { credential?: string }) => void
    act(() => callback({ credential: 'google-id-token' }))

    expect(onCredential).toHaveBeenCalledWith('google-id-token')
  })
})
