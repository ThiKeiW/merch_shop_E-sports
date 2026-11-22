import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { ApiError } from '@/shared/api'

import { login, loginWithGoogle } from './api'
import { AuthShell } from './AuthShell'
import { Field } from './Field'
import { GoogleButton } from './GoogleButton'
import { isGoogleEnabled } from './googleConfig'
import { useAuthStore } from './store'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const setSession = useAuthStore((state) => state.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const goToDestination = () => {
    const from = (location.state as { from?: string } | null)?.from
    navigate(from && from !== '/login' ? from : '/', { replace: true })
  }

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      setSession(session)
      goToDestination()
    },
  })

  const googleMutation = useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: (session) => {
      setSession(session)
      goToDestination()
    },
  })

  if (token) {
    return <Navigate to="/" replace />
  }

  const activeError = googleMutation.error ?? mutation.error
  const errorMessage =
    activeError instanceof ApiError
      ? activeError.message
      : activeError
        ? 'No pudimos conectar con el servidor. Intenta de nuevo.'
        : null

  return (
    <AuthShell
      image="/assets/covers/val.jpg"
      imageAlt=""
      sideTitle={
        <>
          Merch oficial
          <br />
          de tus equipos
        </>
      }
      sideText="LoL · Valorant · Counter-Strike 2 · Dota 2"
    >
      <div>
        <h1 className="display text-center text-3xl">Inicia sesión</h1>
        <p className="mt-2 text-center text-sm text-white/55">
          Guarda tu carrito, sigue tus pedidos y administra la tienda si eres staff.
        </p>

        <form
          className="mt-8 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate({ email: email.trim(), password })
          }}
        >
          <Field
            id="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo electrónico"
          />
          <Field
            id="login-password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
          />

          {errorMessage ? (
            <p
              role="alert"
              className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
            >
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="bevel bevel-p mt-6 w-full py-4"
          >
            {mutation.isPending ? (
              'Entrando…'
            ) : (
              <>
                Entrar <span aria-hidden>→</span>
              </>
            )}
          </button>
        </form>

        {isGoogleEnabled() ? (
          <div className="mt-6">
            <div className="my-6 flex items-center gap-4 text-[0.7rem] font-bold text-white/35">
              <span className="h-px flex-1 bg-white/10" />o<span className="h-px flex-1 bg-white/10" />
            </div>
            <GoogleButton
              onCredential={(idToken) => googleMutation.mutate(idToken)}
              disabled={googleMutation.isPending || mutation.isPending}
            />
            {googleMutation.isPending ? (
              <p className="mt-3 text-center text-xs text-white/45">Conectando con Google…</p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-10 space-y-2 text-center text-[0.72rem] font-extrabold tracking-[0.14em] text-white/45 uppercase">
          <Link to="/registro" className="block transition-colors hover:text-white">
            Crear una cuenta
          </Link>
        </p>
        <p className="mt-6 text-center text-[0.68rem] text-white/25">
          Demo: cliente@merchshop.dev / Cliente1234! · admin@merchshop.dev / Admin1234!
        </p>
      </div>
    </AuthShell>
  )
}
