import { useEffect, useState } from 'react'
import { CalendarDays, User, Search } from 'lucide-react'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTime } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchAppointments() }, [])

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles:patient_id(full_name), doctors(full_name), clinics(name)')
      .order('scheduled_at', { ascending: false })
    setAppointments(data ?? [])
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id)
    toast.success('Status updated')
    fetchAppointments()
  }

  const filtered = appointments.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter
    const matchSearch = !search || a.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <AppShell title="Appointments" subtitle={`${appointments.length} total bookings`}>
      <div className="space-y-4 animate-fade-up">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
          <input className="input pl-9" placeholder="Search patient..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'confirmed', 'completed', 'cancelled', 'pending'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-all ${filter === f ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--border)] text-[var(--muted)]'}`}>
              {f}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-[var(--muted)] mb-3" />
            <p className="font-semibold">No appointments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => (
              <div key={a.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)]">
                      <User className="h-4 w-4 text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">{a.profiles?.full_name || 'Patient'}</p>
                      <p className="text-xs text-[var(--muted)]">Dr. {a.doctors?.full_name}</p>
                      <p className="text-xs text-[var(--muted)]">{formatDate(a.scheduled_at)} · {formatTime(a.scheduled_at)}</p>
                    </div>
                  </div>
                  <select
                    value={a.status}
                    onChange={e => updateStatus(a.id, e.target.value)}
                    className={`text-xs border rounded-lg px-2 py-1 font-medium shrink-0 ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No show</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
