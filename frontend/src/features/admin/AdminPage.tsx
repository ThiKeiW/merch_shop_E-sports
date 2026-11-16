import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/shared/api'

import type { SessionUser } from '@/features/auth'

function fetchUsers(): Promise<SessionUser[]> {
  return apiFetch<SessionUser[]>('/admin/users')
}

export function AdminPage() {
  const query = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchUsers })

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Staff</p>
      <h1 className="font-display mt-3 text-3xl tracking-tight uppercase">Usuarios</h1>
      <p className="mt-3 text-sm text-zinc-400">
        Recurso protegido: solo un ADMIN puede leer esta lista desde la API.
      </p>

      <div className="mt-8 border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
          <span>Registrados</span>
          <span>{query.data?.length ?? 0}</span>
        </div>

        {query.isPending ? (
          <p className="px-4 py-8 text-sm text-zinc-500">Cargando usuarios…</p>
        ) : query.isError ? (
          <p role="alert" className="px-4 py-8 text-sm text-red-300">
            No pudimos cargar los usuarios.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 font-semibold">Nombre</th>
                <th className="px-4 py-2.5 font-semibold">Email</th>
                <th className="px-4 py-2.5 font-semibold">Rol</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((user) => (
                <tr key={user.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 text-zinc-200">{user.displayName}</td>
                  <td className="px-4 py-3 text-zinc-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="border border-line px-2 py-0.5 text-[10px] font-bold tracking-[0.16em] uppercase">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{user.active ? 'Activo' : 'Inactivo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
