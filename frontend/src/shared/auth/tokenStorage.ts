const TOKEN_KEY = 'merch:auth-token'

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

export const tokenStorage = {
  get(): string | null {
    return storage()?.getItem(TOKEN_KEY) ?? null
  },
  set(token: string): void {
    storage()?.setItem(TOKEN_KEY, token)
  },
  clear(): void {
    storage()?.removeItem(TOKEN_KEY)
  },
}
