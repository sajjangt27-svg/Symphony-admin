import { useEffect, useState } from 'react'
import { Users, Stethoscope, CalendarDays, Building2, TrendingUp, Clock, Download } from 'lucide-react'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats] = useState({ patients: 0, doctors: 0, appointments: 0, clinics: 0, revenue: 0, today: 0 })
  const [loading, setLoading] = useState(true)
  const [recentAppts, setRecentAppts] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [clinicStats, setClinicStats] = useState<any[]>([])

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    const [patients, doctors, appointments, clinics, clinicsData] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('doctors').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id, amount_cents, scheduled_at, status, clinic_id'),
      supabase.from('clinics').select('id', { count: 'exact', head: true }),
      supabase.from('clinics').select('id, name'),
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

    // Monthly revenue data (last 6 months)
    const months: any[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthName = d.toLocaleDateString('en-IN', { month: 'short' })
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const monthAppts = appts.filter(a => {
        const dt = new Date(a.scheduled_at)
        return dt >= monthStart && dt <= monthEnd
      })
      const monthRevenue = monthAppts.filter(a => a.status === 'completed').reduce((s, a) => s + (a.amount_cents || 0), 0)
      months.push({ month: monthName, revenue: monthRevenue / 100, bookings: monthAppts.length })
    }
    setMonthlyData(months)

    // Clinic performance
    const clinicPerf = (clinicsData.data ?? []).map(c => {
      const clinicAppts = appts.filter(a => a.clinic_id === c.id)
      const clinicRevenue = clinicAppts.filter(a => a.status === 'completed').reduce((s, a) => s + (a.amount_cents || 0), 0)
      return { name: c.name, bookings: clinicAppts.length, revenue: clinicRevenue / 100 }
    }).sort((a, b) => b.bookings - a.bookings)
    setClinicStats(clinicPerf)

    const { data: recent } = await supabase.from('appointments').select('*, profiles:patient_id(full_name)').order('created_at', { ascending: false }).limit(5)
    setRecentAppts(recent ?? [])
    setLoading(false)
  }

  const exportCSV = async () => {
    const { data } = await supabase.from('appointments').select('*, profiles:patient_id(full_name, email), doctors(full_name), clinics(name)').order('scheduled_at', { ascending: false })
    if (!data) return
    const headers = ['Date', 'Patient', 'Email', 'Doctor', 'Clinic', 'Status', 'Amount']
    const rows = data.map(a => [
      new Date(a.scheduled_at).toLocaleDateString(),
      a.profiles?.full_name || '',
      a.profiles?.email || '',
      a.doctors?.full_name || '',
      a.clinics?.name || '',
      a.status,
      (a.amount_cents / 100).toFixed(2),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'symphony-appointments.csv'; a.click()
    URL.revokeObjectURL(url)
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

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className={`grid h-9 w-9 place-items-center rounded-xl ${colors[color]} mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xl font-bold text-[var(--text)]">{value}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Export button */}
        <button onClick={exportCSV}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--border)] py-3 text-sm font-bold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors bg-white">
          <Download className="h-4 w-4" /> Export appointments CSV
        </button>

        {/* Monthly revenue chart */}
        <div className="card p-5">
          <h2 className="font-display text-base font-bold text-[var(--text)] mb-4">Monthly revenue (₹)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`₹${v}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly bookings chart */}
        <div className="card p-5">
          <h2 className="font-display text-base font-bold text-[var(--text)] mb-4">Monthly bookings</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="bookings" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Clinic performance */}
        <div className="card p-5">
          <h2 className="font-display text-base font-bold text-[var(--text)] mb-4">Clinic performance</h2>
          {clinicStats.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-4">No data yet</p>
          ) : (
            <div className="space-y-3">
              {clinicStats.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-50">
                    <Building2 className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate">{c.name}</p>
                    <p className="text-xs text-[var(--muted)]">{c.bookings} bookings · ₹{c.revenue.toFixed(0)}</p>
                  </div>
                  <div className="text-xs font-bold text-indigo-600">#{i + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent bookings */}
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--text)] mb-3">Recent bookings</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14" />)}</div>
          ) : (
            <div className="space-y-2">
              {recentAppts.map(a => (
                <div key={a.id} className="card flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{a.profiles?.full_name || 'Patient'}</p>
                    <p className="text-xs text-[var(--muted)]">{new Date(a.scheduled_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`badge capitalize ${
                    a.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    a.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'}`}>
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