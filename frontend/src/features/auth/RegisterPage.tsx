import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { ApiError } from '@/shared/api'

import { register } from './api'
import { Field } from './Field'
import { useAuthStore } from './store'

export function RegisterPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const setSession = useAuthStore((state) => state.setSession)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      setSession(session)
      navigate('/', { replace: true })
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
      <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Cuenta nueva</p>
      <h1 className="font-display mt-3 text-3xl tracking-tight uppercase">Regístrate</h1>
      <p className="mt-3 text-sm text-zinc-400">
        Crea tu cuenta para comprar merch de tus equipos favoritos.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          mutation.mutate({ displayName: displayName.trim(), email: email.trim(), password })
        }}
      >
        <Field
          id="register-name"
          label="Nombre visible"
          type="text"
          autoComplete="nickname"
          required
          minLength={2}
          maxLength={80}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="GamerTag"
        />
        <Field
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@correo.com"
        />
        <Field
          id="register-password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo 8 caracteres"
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
          {mutation.isPending ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-xs text-zinc-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-zinc-300 underline underline-offset-4">
          Iniciar sesión
        </Link>
      </p>
    </section>
  )
}
