import { useEffect, useState } from 'react'
import { Users, User, Shield, Stethoscope, Building2, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    const [usersRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
    ])
    setUsers(usersRes.data ?? [])
    setRoles(rolesRes.data ?? [])
    setLoading(false)
  }

  const getUserRole = (userId: string) => {
    return roles.find(r => r.user_id === userId)?.role || 'patient'
  }

  const setRole = async (userId: string, role: string) => {
    const existing = roles.find(r => r.user_id === userId)
    if (existing) {
      await supabase.from('user_roles').update({ role }).eq('id', existing.id)
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role })
    }
    toast.success('Role updated!')
    fetchUsers()
  }

  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-blue-100 text-blue-700',
    wizard: 'bg-purple-100 text-purple-700',
    doctor: 'bg-green-100 text-green-700',
    patient: 'bg-gray-100 text-gray-600',
  }

  return (
    <AppShell title="More" subtitle="Manage your platform">
      <div className="space-y-3 animate-fade-up">

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {[
            { to: '/doctors', icon: Stethoscope, label: 'Doctors', bg: 'bg-indigo-50', color: 'text-indigo-500' },
            { to: '/clinics', icon: Building2, label: 'Clinics', bg: 'bg-orange-50', color: 'text-orange-500' },
            { to: '/notifications', icon: Bell, label: 'Alerts', bg: 'bg-purple-50', color: 'text-purple-500' },
          ].map(({ to, icon: Icon, label, bg, color }) => (
            <Link key={to} to={to} className="card flex flex-col items-center gap-2 p-4 hover:shadow-[var(--shadow-md)] transition-all">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-xs font-bold text-[var(--text)]">{label}</p>
            </Link>
          ))}
        </div>

        <h2 className="font-display text-base font-bold text-[var(--text)] mt-2">All users</h2>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-gray-100" />)}</div>
        ) : users.map(u => {
          const role = getUserRole(u.id)
          return (
            <div key={u.id} className="card p-4 flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)]">
                <User className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text)] truncate">{u.full_name || 'User'}</p>
                <p className="text-xs text-[var(--muted)] truncate">{u.email}</p>
              </div>
              <select
                value={role}
                onChange={e => setRole(u.id, e.target.value)}
                className={`text-xs border rounded-lg px-2 py-1 font-medium shrink-0 ${ROLE_COLORS[role] || 'bg-gray-100'}`}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="wizard">Wizard</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
