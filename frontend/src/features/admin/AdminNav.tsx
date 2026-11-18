import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/admin', label: 'Usuarios', end: true },
  { to: '/admin/productos', label: 'Productos', end: false },
]

export function AdminNav() {
  return (
    <nav aria-label="Secciones de administración" className="flex gap-2 border-b border-line">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            [
              '-mb-px border-b-2 px-4 py-2.5 text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors',
              isActive
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-200',
            ].join(' ')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
