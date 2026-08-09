import { NavLink, Outlet } from 'react-router'

const navItems = [{ to: '/', label: 'Home' }]

export default function RootLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">mirelab</span>
          <nav className="flex gap-4 text-sm">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  isActive ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
