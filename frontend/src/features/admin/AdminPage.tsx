import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/shared/api'

import type { SessionUser } from '@/features/auth'

import { AdminNav } from './AdminNav'

function fetchUsers(): Promise<SessionUser[]> {
  return apiFetch<SessionUser[]>('/admin/users')
}

export function AdminPage() {
  const query = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchUsers })

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-28 md:px-8">
      <p className="eyebrow">Staff</p>
      <h1 className="display mt-2 text-4xl md:text-6xl">Administración</h1>
      <p className="mt-3 text-sm text-white/50">
        Gestiona usuarios y el catálogo editable de la tienda.
      </p>

      <div className="mt-8">
        <AdminNav />
      </div>

      <div className="box mt-6">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-[0.65rem] font-extrabold tracking-[0.2em] text-white/45 uppercase">
          <span>Usuarios registrados</span>
          <span>{query.data?.length ?? 0}</span>
        </div>

        {query.isPending ? (
          <p className="px-5 py-10 text-sm text-white/45">Cargando usuarios…</p>
        ) : query.isError ? (
          <p role="alert" className="px-5 py-10 text-sm text-red-300">
            No pudimos cargar los usuarios.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-[0.65rem] font-extrabold tracking-[0.2em] text-white/40 uppercase">
                <tr className="border-b border-white/10">
                  <th className="px-5 py-3 font-extrabold">Nombre</th>
                  <th className="px-5 py-3 font-extrabold">Email</th>
                  <th className="px-5 py-3 font-extrabold">Rol</th>
                  <th className="px-5 py-3 font-extrabold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(query.data ?? []).map((user) => (
                  <tr key={user.id} className="border-b border-white/10 last:border-0">
                    <td className="px-5 py-4 font-bold text-white">{user.displayName}</td>
                    <td className="px-5 py-4 text-white/55">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="bevel bevel-xs pointer-events-none">{user.role}</span>
                    </td>
                    <td className="px-5 py-4 text-white/55">{user.active ? 'Activo' : 'Inactivo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
