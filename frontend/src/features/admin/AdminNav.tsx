import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/admin', label: 'Usuarios', end: true },
  { to: '/admin/productos', label: 'Productos', end: false },
]

export function AdminNav() {
  return (
    <nav aria-label="Secciones de administración" className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            ['bevel bevel-sm', isActive ? 'bevel-p' : ''].join(' ')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
