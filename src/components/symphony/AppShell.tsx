import { ReactNode, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, LogOut, Music2, LayoutDashboard, Stethoscope, Building2, CalendarDays, Wand2, Users, Bell, ClipboardList } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Props { children: ReactNode; showBack?: boolean; title?: string; subtitle?: string }

export function AppShell({ children, showBack, title, subtitle }: Props) {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const adminNav = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/appointments', icon: CalendarDays, label: 'Bookings' },
    { path: '/wizard', icon: Wand2, label: 'Wizard' },
    { path: '/applications', icon: ClipboardList, label: 'Apply' },
    { path: '/users', icon: Users, label: 'More' },
  ]

  const wizardNav = [
    { path: '/wizard', icon: Wand2, label: 'Wizard' },
  ]

  const navItems = role === 'wizard' ? wizardNav : adminNav

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          {showBack ? (
            <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary)]">
                <Music2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-display text-base font-semibold text-[var(--text)]">Symphony</span>
                <span className="ml-1.5 text-xs text-[var(--muted)]">{role === 'wizard' ? 'Wizard' : 'Admin'}</span>
              </div>
            </Link>
          )}
          <div className="ml-auto">
            {user && (
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--primary)] transition-colors">
                  <span className="text-xs font-medium">{role === 'wizard' ? '🧙 Wizard' : '🛡️ Admin'}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-lg)] overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-[var(--border)]">
                      <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                    </div>
                    <button onClick={() => { signOut(); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6">
        {(title || subtitle) && (
          <div className="mb-6 animate-fade-up">
            {title && <h1 className="text-2xl font-display font-bold text-[var(--text)]">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-around px-4 py-2">
            {navItems.map(({ path, icon: Icon, label }) => {
              const active = location.pathname === path
              return (
                <Link key={path} to={path}
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${active ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
