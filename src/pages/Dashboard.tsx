import { useEffect, useState } from 'react'
import { Users, Stethoscope, CalendarDays, Building2, TrendingUp, Clock } from 'lucide-react'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

export default function DashboardPage() {
  const [stats, setStats] = useState({ patients: 0, doctors: 0, appointments: 0, clinics: 0, revenue: 0, today: 0 })
  const [loading, setLoading] = useState(true)
  const [recentAppts, setRecentAppts] = useState<any[]>([])

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    const [patients, doctors, appointments, clinics] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('doctors').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id, amount_cents, scheduled_at, status'),
      supabase.from('clinics').select('id', { count: 'exact', head: true }),
    ])
    const appts = appointments.data ?? []
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayCount = appts.filter(a => new Date(a.scheduled_at) >= today).length
    const revenue = appts.filter(a => a.status === 'completed').reduce((s, a) => s + (a.amount_cents || 0), 0)
    setStats({
      patients: patients.count ?? 0,
      doctors: doctors.count ?? 0,
      appointments: appts.length,
      clinics: clinics.count ?? 0,
      revenue,
      today: todayCount,
    })
    const { data: recent } = await supabase.from('appointments').select('*, profiles:patient_id(full_name)').order('created_at', { ascending: false }).limit(5)
    setRecentAppts(recent ?? [])
    setLoading(false)
  }

  const statCards = [
    { label: 'Total patients', value: stats.patients, icon: Users, color: 'blue' },
    { label: 'Doctors', value: stats.doctors, icon: Stethoscope, color: 'green' },
    { label: 'Appointments', value: stats.appointments, icon: CalendarDays, color: 'purple' },
    { label: 'Clinics', value: stats.clinics, icon: Building2, color: 'orange' },
    { label: 'Revenue', value: formatCurrency(stats.revenue), icon: TrendingUp, color: 'green', isText: true },
    { label: 'Today', value: stats.today, icon: Clock, color: 'blue' },
  ]

  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <AppShell title="Dashboard" subtitle="Symphony overview">
      <div className="space-y-5 animate-fade-up">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {statCards.map(({ label, value, icon: Icon, color, isText }) => (
            <div key={label} className="card p-4">
              <div className={`grid h-9 w-9 place-items-center rounded-xl ${colors[color]} mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xl font-bold text-[var(--text)]">{value}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--text)] mb-3">Recent bookings</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card h-14 animate-pulse bg-gray-100" />)}</div>
          ) : (
            <div className="space-y-2">
              {recentAppts.map(a => (
                <div key={a.id} className="card flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{a.profiles?.full_name || 'Patient'}</p>
                    <p className="text-xs text-[var(--muted)]">{new Date(a.scheduled_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`badge capitalize ${a.status === 'confirmed' ? 'bg-green-100 text-green-700' : a.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
