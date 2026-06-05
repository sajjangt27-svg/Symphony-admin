import { useEffect, useState } from 'react'
import { Bell, CalendarDays, User, Stethoscope, CheckCheck } from 'lucide-react'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTime } from '@/lib/utils'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchNotifications() }, [])

  const fetchNotifications = async () => {
    const [appts, apps] = await Promise.all([
      supabase.from('appointments').select('*, profiles:patient_id(full_name), doctors(full_name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('doctor_applications').select('*').order('applied_at', { ascending: false }).limit(10),
    ])

    const apptNotifs = (appts.data ?? []).map(a => ({
      id: a.id,
      type: 'appointment',
      title: `New appointment booked`,
      desc: `${a.profiles?.full_name || 'Patient'} booked with Dr. ${a.doctors?.full_name}`,
      time: a.created_at,
      status: a.status,
    }))

    const appNotifs = (apps.data ?? []).map(a => ({
      id: a.id,
      type: 'application',
      title: 'New doctor application',
      desc: `${a.full_name} applied as ${a.specialty}`,
      time: a.applied_at,
      status: a.status,
    }))

    const all = [...apptNotifs, ...appNotifs].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setNotifications(all)
    setLoading(false)
  }

  const TYPE_CONFIG: Record<string, { icon: any; bg: string; color: string }> = {
    appointment: { icon: CalendarDays, bg: 'bg-indigo-50', color: 'text-indigo-500' },
    application: { icon: Stethoscope, bg: 'bg-green-50', color: 'text-green-500' },
  }

  const STATUS_COLORS: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-600',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
  }

  return (
    <AppShell title="Notifications" subtitle="Recent activity across Symphony">
      <div className="space-y-4 animate-fade-up">
        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-3">🔔</div>
            <p className="font-semibold text-[var(--text)]">No notifications yet</p>
            <p className="text-sm text-[var(--muted)] mt-1">Activity will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.appointment
              const Icon = config.icon
              return (
                <div key={`${n.type}-${n.id}-${i}`}
                  className="card flex items-start gap-3 p-4 animate-fade-up"
                  style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text)]">{n.title}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{n.desc}</p>
                    <p className="text-[10px] text-[var(--muted)] mt-1">
                      {formatDate(n.time)} · {formatTime(n.time)}
                    </p>
                  </div>
                  <span className={`badge ${STATUS_COLORS[n.status] || 'bg-gray-100 text-gray-600'} capitalize shrink-0 text-[10px]`}>
                    {n.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
