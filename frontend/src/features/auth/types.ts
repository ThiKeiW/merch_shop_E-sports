export type Role = 'CUSTOMER' | 'ADMIN'

export type SessionUser = {
  id: number
  email: string
  displayName: string
  role: Role
  active: boolean
  createdAt: string
}

export type AuthResponse = {
  token: string
  tokenType: string
  expiresIn: number
  user: SessionUser
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  email: string
  password: string
  displayName: string
}
