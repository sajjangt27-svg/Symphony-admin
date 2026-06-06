import { useEffect, useState } from 'react'
import { Stethoscope, CheckCircle, XCircle, Clock, Phone, Mail, Award } from 'lucide-react'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [clinics, setClinics] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [appsRes, clinicsRes, catsRes] = await Promise.all([
      supabase.from('doctor_applications').select('*').order('applied_at', { ascending: false }),
      supabase.from('clinics').select('id, name'),
      supabase.from('categories').select('id, name'),
    ])
    setApplications(appsRes.data ?? [])
    setClinics(clinicsRes.data ?? [])
    setCategories(catsRes.data ?? [])
    setLoading(false)
  }

  const approve = async (app: any) => {
    setProcessing(app.id)
    try {
      // Find matching category
      const cat = categories.find(c => c.name.toLowerCase().includes(app.specialty.toLowerCase()))
      const clinic = clinics[0] // Default to first clinic

      // Create doctor account
      const { error: docErr } = await supabase.from('doctors').insert({
        full_name: app.full_name,
        specialty: app.specialty,
        qualification: app.qualification,
        experience_years: app.experience_years,
        bio: app.bio,
        consultation_fee_cents: 50000,
        clinic_id: clinic?.id ?? null,
        category_id: cat?.id ?? null,
        is_active: true,
        user_id: app.user_id ?? null,
      })
      if (docErr) throw docErr

      // Update application status
      await supabase.from('doctor_applications').update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      }).eq('id', app.id)

      toast.success(`Dr. ${app.full_name} approved! ✅`)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setProcessing(null)
    }
  }

  const reject = async (id: string) => {
    setProcessing(id)
    await supabase.from('doctor_applications').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    toast.success('Application rejected')
    setProcessing(null)
    fetchAll()
  }

  const filtered = applications.filter(a => filter === 'all' || a.status === filter)

  return (
    <AppShell title="Doctor applications" subtitle={`${applications.filter(a => a.status === 'pending').length} pending review`}>
      <div className="space-y-4 animate-fade-up">

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-all ${
                filter === f ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--border)] text-[var(--muted)]'
              }`}>
              {f} {f === 'pending' ? `(${applications.filter(a => a.status === 'pending').length})` : ''}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-32" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-semibold text-[var(--text)]">No applications</p>
            <p className="text-sm text-[var(--muted)] mt-1">
              {filter === 'pending' ? 'No pending applications' : `No ${filter} applications`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((app, i) => (
              <div key={app.id} className="card p-5 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50">
                      <Stethoscope className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text)]">Dr. {app.full_name}</p>
                      <p className="text-xs text-[var(--muted)]">{app.specialty}</p>
                    </div>
                  </div>
                  <span className={`badge ${STATUS_COLORS[app.status] || 'bg-gray-100'} capitalize shrink-0`}>
                    {app.status}
                  </span>
                </div>

                <div className="space-y-1.5 mb-4">
                  <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Mail className="h-3.5 w-3.5" /> {app.email}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Phone className="h-3.5 w-3.5" /> {app.phone}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Award className="h-3.5 w-3.5" /> {app.qualification} · {app.experience_years}y exp
                  </p>
                  <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Clock className="h-3.5 w-3.5" /> Applied {formatDate(app.applied_at)}
                  </p>
                </div>

                {app.bio && (
                  <p className="text-xs text-[var(--muted)] mb-4 line-clamp-2 p-3 rounded-xl bg-gray-50">
                    {app.bio}
                  </p>
                )}

                {app.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => reject(app.id)}
                      disabled={processing === app.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-red-200 text-red-500 py-2.5 text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <button
                      onClick={() => approve(app)}
                      disabled={processing === app.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl text-white py-2.5 text-sm font-bold transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {processing === app.id ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
                        }
