import { useEffect, useState } from 'react'
import { Bed, CheckCircle2, Search, Wand2, Users, Clock, AlertCircle, Plus, X } from 'lucide-react'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTime } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const TASK_COLORS: Record<string, string> = {
  scheduled: 'bg-yellow-100 text-yellow-700',
  checked_in: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  skipped: 'bg-gray-100 text-gray-500',
}

export default function WizardPage() {
  const { user, role } = useAuth()
  const [admissions, setAdmissions] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [wizardClinic, setWizardClinic] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'wards' | 'admit' | 'tasks'>('wards')
  const [selectedAppt, setSelectedAppt] = useState('')
  const [ward, setWard] = useState('')
  const [bedNumber, setBedNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [admitNotes, setAdmitNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedAdmission, setExpandedAdmission] = useState<string | null>(null)
  const [allTasks, setAllTasks] = useState<any[]>([])

  useEffect(() => { fetchAll() }, [user])

  const fetchAll = async () => {
    if (!user) return

    // Get wizard's clinic
    const { data: wizardProfile } = await supabase
      .from('wizard_profiles')
      .select('*, clinics(id, name, address, city)')
      .eq('user_id', user.id)
      .maybeSingle()

    setWizardClinic(wizardProfile?.clinics ?? null)

    const clinicId = wizardProfile?.clinic_id

    const [adm, appts, tasks] = await Promise.all([
      supabase.from('admissions')
        .select('*, doctors(full_name), clinics(name)')
        .eq('status', 'admitted')
        .order('admitted_at', { ascending: false }),
      supabase.from('appointments')
        .select('*, doctors(full_name)')
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false })
        .limit(50),
      supabase.from('care_tasks')
        .select('*, admissions(ward, bed_number, floor)')
        .order('scheduled_at', { ascending: true }),
    ])

    setAdmissions(adm.data ?? [])
    setAppointments(appts.data ?? [])
    setAllTasks(tasks.data ?? [])
    setLoading(false)
  }

  const admitPatient = async () => {
    if (!selectedAppt || !ward || !bedNumber) { toast.error('Fill all required fields'); return }
    setSaving(true)
    const appt = appointments.find(a => a.id === selectedAppt)
    if (!appt) { toast.error('Appointment not found'); setSaving(false); return }
    const visitCode = 'SYM-' + Math.random().toString(36).substring(2, 6).toUpperCase()
    const { error } = await supabase.from('admissions').insert({
      appointment_id: selectedAppt,
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      clinic_id: appt.clinic_id,
      ward, bed_number: bedNumber, floor,
      notes: admitNotes,
      status: 'admitted',
      visit_code: visitCode,
      wizard_id: user!.id,
    })
    setSaving(false)
    if (error) toast.error(error.message)
    else {
      toast.success(`Patient admitted! Code: ${visitCode}`)
      setSelectedAppt(''); setWard(''); setBedNumber(''); setFloor(''); setAdmitNotes('')
      fetchAll()
      setTab('wards')
    }
  }

  const discharge = async (id: string) => {
    await supabase.from('admissions').update({ status: 'discharged', discharged_at: new Date().toISOString() }).eq('id', id)
    toast.success('Patient discharged!')
    fetchAll()
  }

  const confirmTask = async (taskId: string) => {
    await supabase.from('care_tasks').update({
      status: 'confirmed',
      wizard_confirmed_at: new Date().toISOString(),
      wizard_id: user!.id,
    }).eq('id', taskId)
    toast.success('Task confirmed!')
    fetchAll()
  }

  const pendingTasks = allTasks.filter(t => t.status === 'checked_in')
  const filteredAdmissions = admissions.filter(a =>
    !search || a.ward?.toLowerCase().includes(search.toLowerCase())
  )

  // Group admissions by ward
  const wardGroups: Record<string, any[]> = {}
  filteredAdmissions.forEach(a => {
    const ward = a.ward || 'Unassigned'
    if (!wardGroups[ward]) wardGroups[ward] = []
    wardGroups[ward].push(a)
  })

  return (
    <AppShell title={`🧙 Wizard`} subtitle={wizardClinic ? `${wizardClinic.name} · ${wizardClinic.city}` : 'Hospital operations'}>
      <div className="space-y-4 animate-fade-up">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{admissions.length}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Admitted</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingTasks.length}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Tasks pending</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{Object.keys(wardGroups).length}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Wards active</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-gray-100 p-1">
          <button onClick={() => setTab('wards')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${tab === 'wards' ? 'bg-white shadow text-[var(--text)]' : 'text-[var(--muted)]'}`}>
            🏥 Wards
          </button>
          <button onClick={() => setTab('tasks')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${tab === 'tasks' ? 'bg-white shadow text-[var(--text)]' : 'text-[var(--muted)]'}`}>
            ✅ Tasks {pendingTasks.length > 0 && `(${pendingTasks.length})`}
          </button>
          <button onClick={() => setTab('admit')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${tab === 'admit' ? 'bg-white shadow text-[var(--text)]' : 'text-[var(--muted)]'}`}>
            ➕ Admit
          </button>
        </div>

        {/* WARDS TAB */}
        {tab === 'wards' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
              <input className="input pl-11" placeholder="Search ward..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
              <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-24" />)}</div>
            ) : Object.keys(wardGroups).length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-5xl mb-3">🏥</div>
                <p className="font-semibold text-[var(--text)]">No admitted patients</p>
                <p className="text-sm text-[var(--muted)] mt-1">Admit a patient to get started</p>
                <button onClick={() => setTab('admit')} className="btn-primary mt-4 text-sm py-2 px-4">
                  Admit patient
                </button>
              </div>
            ) : (
              Object.entries(wardGroups).map(([wardName, patients]) => (
                <div key={wardName} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-base font-bold text-[var(--text)] flex items-center gap-2">
                      <Bed className="h-4 w-4 text-purple-500" />
                      Ward {wardName}
                    </h3>
                    <span className="badge bg-purple-100 text-purple-700">{patients.length} patient{patients.length > 1 ? 's' : ''}</span>
                  </div>

                  <div className="space-y-3">
                    {patients.map(p => {
                      const patientTasks = allTasks.filter(t => t.admission_id === p.id)
                      const pendingPatientTasks = patientTasks.filter(t => t.status === 'checked_in')
                      const isExpanded = expandedAdmission === p.id

                      return (
                        <div key={p.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                          pendingPatientTasks.length > 0 ? 'border-yellow-200' : 'border-[var(--border)]'
                        }`}>
                          <button
                            onClick={() => setExpandedAdmission(isExpanded ? null : p.id)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-50">
                              <span className="text-sm font-bold text-purple-600">{p.bed_number}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[var(--text)]">Bed {p.bed_number} {p.floor ? `· ${p.floor}` : ''}</p>
                              <p className="text-xs text-[var(--muted)]">Dr. {p.doctors?.full_name}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {pendingPatientTasks.length > 0 && (
                                <span className="badge bg-yellow-100 text-yellow-700">{pendingPatientTasks.length} pending</span>
                              )}
                              <span className="text-[var(--muted)]">{isExpanded ? '▲' : '▼'}</span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-[var(--border)] p-3 space-y-3 bg-gray-50">
                              {/* Visit code */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-[var(--muted)] uppercase font-bold">Visit code</p>
                                  <p className="font-mono text-lg font-bold text-purple-600">{p.visit_code}</p>
                                </div>
                                <p className="text-xs text-[var(--muted)]">Admitted {formatDate(p.admitted_at)}</p>
                              </div>

                              {/* Care tasks */}
                              {patientTasks.length > 0 && (
                                <div>
                                  <p className="text-xs font-bold text-[var(--muted)] mb-2">Care tasks</p>
                                  <div className="space-y-2">
                                    {patientTasks.map(task => (
                                      <div key={task.id} className="flex items-center gap-2 rounded-xl bg-white border border-[var(--border)] p-2.5">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-bold text-[var(--text)]">{task.title}</p>
                                          {task.scheduled_at && (
                                            <p className="text-[10px] text-[var(--muted)]">{formatTime(task.scheduled_at)}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className={`badge ${TASK_COLORS[task.status] || 'bg-gray-100'} capitalize text-[10px]`}>
                                            {task.status.replace('_', ' ')}
                                          </span>
                                          {task.status === 'checked_in' && (
                                            <button
                                              onClick={() => confirmTask(task.id)}
                                              className="rounded-lg bg-green-500 text-white text-[10px] font-bold px-2 py-1 hover:bg-green-600 transition-colors"
                                            >
                                              Confirm
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              {p.notes && (
                                <p className="text-xs text-[var(--muted)] bg-white rounded-xl p-2 border border-[var(--border)]">
                                  📝 {p.notes}
                                </p>
                              )}

                              {/* Discharge button */}
                              <button
                                onClick={() => discharge(p.id)}
                                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-green-500 text-white font-bold py-2.5 text-sm hover:bg-green-600 transition-colors"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Discharge patient
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {tab === 'tasks' && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">Tasks needing confirmation</p>
            {pendingTasks.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-5xl mb-3">✅</div>
                <p className="font-semibold text-[var(--text)]">All tasks confirmed!</p>
                <p className="text-sm text-[var(--muted)] mt-1">No pending nurse check-ins</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <div key={task.id} className="card p-4 border-l-4 border-yellow-400">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text)]">{task.title}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5 capitalize">{task.task_type?.replace('_', ' ')}</p>
                      {task.admissions && (
                        <p className="text-xs text-purple-600 font-medium mt-1">
                          Ward {task.admissions.ward} · Bed {task.admissions.bed_number}
                        </p>
                      )}
                      {task.scheduled_at && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">🕐 {formatDate(task.scheduled_at)} · {formatTime(task.scheduled_at)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => confirmTask(task.id)}
                      className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-green-500 text-white text-xs font-bold px-3 py-2 hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* All tasks overview */}
            {allTasks.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide mt-4 mb-2">All tasks today</p>
                <div className="space-y-2">
                  {allTasks.map(task => (
                    <div key={task.id} className="card p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text)] truncate">{task.title}</p>
                        {task.admissions && (
                          <p className="text-[10px] text-[var(--muted)]">Ward {task.admissions.ward} · Bed {task.admissions.bed_number}</p>
                        )}
                      </div>
                      <span className={`badge ${TASK_COLORS[task.status] || 'bg-gray-100'} capitalize text-[10px] shrink-0`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADMIT TAB */}
        {tab === 'admit' && (
          <div className="card p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-[var(--text)]">Admit a patient</h2>
            <select className="input" value={selectedAppt} onChange={e => setSelectedAppt(e.target.value)}>
              <option value="">Select completed appointment *</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  Patient — Dr. {a.doctors?.full_name} ({formatDate(a.scheduled_at)})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Ward *" value={ward} onChange={e => setWard(e.target.value)} />
              <input className="input" placeholder="Bed number *" value={bedNumber} onChange={e => setBedNumber(e.target.value)} />
            </div>
            <input className="input" placeholder="Floor (e.g. 2nd floor)" value={floor} onChange={e => setFloor(e.target.value)} />
            <textarea className="input resize-none h-20" placeholder="Admission notes..." value={admitNotes} onChange={e => setAdmitNotes(e.target.value)} />
            <button onClick={admitPatient} disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-2xl text-white font-bold py-3 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <Wand2 className="h-4 w-4" /> {saving ? 'Admitting...' : 'Admit patient'}
            </button>
          </div>
        )}

      </div>
    </AppShell>
  )
}