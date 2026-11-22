import { useEffect, useRef, useState } from 'react'

const SCRIPT_ID = 'google-identity-services'
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

type CredentialResponse = {
  credential?: string
}

type GoogleAccounts = {
  initialize: (options: { client_id: string; callback: (response: CredentialResponse) => void }) => void
  renderButton: (
    parent: HTMLElement,
    options: { theme?: string; size?: string; shape?: string; text?: string; width?: number },
  ) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccounts } }
  }
}

let scriptPromise: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts.id) {
    return Promise.resolve()
  }

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
      const script = existing ?? document.createElement('script')

      script.addEventListener('load', () => resolve())
      script.addEventListener('error', () => {
        scriptPromise = null
        reject(new Error('No se pudo cargar Google Identity Services'))
      })

      if (!existing) {
        script.id = SCRIPT_ID
        script.src = SCRIPT_SRC
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
    })
  }

  return scriptPromise
}

type GoogleButtonProps = {
  onCredential: (idToken: string) => void
  disabled?: boolean
}

export function GoogleButton({ onCredential, disabled = false }: GoogleButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onCredential)
  const [failed, setFailed] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''

  useEffect(() => {
    callbackRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!clientId || disabled) {
      return
    }

    let cancelled = false
    const container = containerRef.current

    loadGoogleScript()
      .then(() => {
        if (cancelled || !container || !window.google) {
          return
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              callbackRef.current(response.credential)
            }
          },
        })

        container.replaceChildren()
        window.google.accounts.id.renderButton(container, {
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: Math.min(320, container.clientWidth || 320),
        })
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [clientId, disabled])

  if (!clientId) {
    return null
  }

  if (failed) {
    return (
      <p className="text-center text-xs text-white/45">
        No se pudo cargar el acceso con Google. Usa tu email y contraseña.
      </p>
    )
  }

  return <div ref={containerRef} className="flex justify-center" aria-label="Acceso con Google" />
}
