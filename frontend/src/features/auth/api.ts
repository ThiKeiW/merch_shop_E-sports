import { apiFetch } from '@/shared/api'

import type { AuthResponse, LoginPayload, RegisterPayload, SessionUser } from './types'

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchMe(): Promise<SessionUser> {
  return apiFetch<SessionUser>('/auth/me')
}
