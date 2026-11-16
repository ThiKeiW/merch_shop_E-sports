import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { ApiError } from '@/shared/api'

import { fetchMe } from './api'
import { useAuthStore } from './store'

export function useSession() {
  const token = useAuthStore((state) => state.token)
  const setUser = useAuthStore((state) => state.setUser)
  const clear = useAuthStore((state) => state.clear)

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (query.data) {
      setUser(query.data)
    }
  }, [query.data, setUser])

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      clear()
    }
  }, [query.error, clear])

  return { isRestoring: Boolean(token) && query.isPending }
}
