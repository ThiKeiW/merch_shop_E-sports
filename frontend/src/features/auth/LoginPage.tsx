import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { ApiError } from '@/shared/api'

import { login } from './api'
import { Field } from './Field'
import { useAuthStore } from './store'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const setSession = useAuthStore((state) => state.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      setSession(session)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    },
  })

  if (token) {
    return <Navigate to="/" replace />
  }

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'No pudimos conectar con el servidor. Intenta de nuevo.'
        : null

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Acceso</p>
      <h1 className="font-display mt-3 text-3xl tracking-tight uppercase">Inicia sesión</h1>
      <p className="mt-3 text-sm text-zinc-400">
        Entra para guardar tu carrito, seguir tus pedidos y, si eres staff, administrar la tienda.
      </p>

      <form
        className="mt-8 space-y-5"
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
          placeholder="tu@correo.com"
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
          placeholder="********"
        />

        {errorMessage ? (
          <p role="alert" className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-white px-4 py-3 text-xs font-bold tracking-[0.2em] text-ink uppercase transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-xs text-zinc-500">
        ¿Sin cuenta?{' '}
        <Link to="/registro" className="text-zinc-300 underline underline-offset-4">
          Crear una cuenta
        </Link>
      </p>
      <p className="mt-2 text-xs text-zinc-600">
        Demo: cliente@merchshop.dev / Cliente1234! · admin@merchshop.dev / Admin1234!
      </p>
    </section>
  )
}
