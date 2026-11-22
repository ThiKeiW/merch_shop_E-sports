import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { ApiError } from '@/shared/api'

import { register } from './api'
import { AuthShell } from './AuthShell'
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
    <AuthShell
      image="/assets/covers/lol.jpg"
      imageAlt=""
      sideTitle={
        <>
          Tu identidad
          <br />
          empieza aquí
        </>
      }
      sideText="Crea tu cuenta y guarda tu selección entre sesiones."
    >
      <div>
        <h1 className="display text-center text-3xl">Regístrate</h1>
        <p className="mt-2 text-center text-sm text-white/55">
          Crea tu cuenta para comprar merch de tus equipos favoritos.
        </p>

        <form
          className="mt-8 space-y-3"
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
            placeholder="Nombre visible (GamerTag)"
          />
          <Field
            id="register-email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo electrónico"
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
            placeholder="Contraseña (mín. 8 caracteres)"
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
              'Creando…'
            ) : (
              <>
                Crear cuenta <span aria-hidden>→</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-10 text-center text-[0.72rem] font-extrabold tracking-[0.14em] text-white/45 uppercase">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-white underline underline-offset-4">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
