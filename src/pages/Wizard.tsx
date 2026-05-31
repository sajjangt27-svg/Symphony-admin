import { useEffect, useState } from 'react'
import { Bed, Plus, CheckCircle2, Search, Wand2 } from 'lucide-react'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTime } from '@/lib/utils'
import { toast } from 'sonner'

export default function WizardPage() {
  const [admissions, setAdmissions] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdmitForm, setShowAdmitForm] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState('')
  const [ward, setWard] = useState('')
  const [bedNumber, setBedNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [admitNotes, setAdmitNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'admitted' | 'admit'>('admitted')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [adm, appts] = await Promise.all([
      supabase.from('admissions').select('*, doctors(full_name), clinics(name)').eq('status', 'admitted').order('admitted_at', { ascending: false }),
      supabase.from('appointments').select('*, doctors(full_name)').eq('status', 'completed').order('scheduled_at', { ascending: false }).limit(50),
    ])
    setAdmissions(adm.data ?? [])
    setAppointments(appts.data ?? [])
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
    })
    setSaving(false)
    if (error) toast.error(error.message)
    else {
      toast.success(`Patient admitted! Code: ${visitCode}`)
      setShowAdmitForm(false)
      setSelectedAppt(''); setWard(''); setBedNumber(''); setFloor(''); setAdmitNotes('')
      fetchAll()
    }
  }

  const discharge = async (id: string) => {
    await supabase.from('admissions').update({ status: 'discharged', discharged_at: new Date().toISOString() }).eq('id', id)
    toast.success('Patient discharged!')
    fetchAll()
  }

  const filteredAdmissions = admissions.filter(a =>
    !search || a.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell title="Wizard 🧙" subtitle="Hospital admissions & operations">
      <div className="space-y-4 animate-fade-up">

        {/* Tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1">
          <button onClick={() => setTab('admitted')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${tab === 'admitted' ? 'bg-white shadow-sm text-[var(--text)]' : 'text-[var(--muted)]'}`}>
            Admitted ({admissions.length})
          </button>
          <button onClick={() => setTab('admit')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${tab === 'admit' ? 'bg-white shadow-sm text-[var(--text)]' : 'text-[var(--muted)]'}`}>
            Admit patient
          </button>
        </div>

        {tab === 'admitted' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
              <input className="input pl-9" placeholder="Search patient..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}</div>
            ) : filteredAdmissions.length === 0 ? (
              <div className="card p-8 text-center">
                <Bed className="h-10 w-10 mx-auto text-[var(--muted)] mb-3" />
                <p className="font-semibold text-[var(--text)]">No admitted patients</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAdmissions.map(a => (
                  <div key={a.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-[var(--text)]">Admitted Patient</p>
                        <p className="text-xs text-[var(--muted)]">Dr. {a.doctors?.full_name}</p>
                      </div>
                      <div className="rounded-xl bg-purple-50 border border-purple-100 px-3 py-1.5 text-center shrink-0">
                        <p className="text-[10px] text-purple-400">Visit code</p>
                        <p className="text-sm font-bold font-mono text-purple-700">{a.visit_code}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[['Ward', a.ward], ['Bed', a.bed_number], ['Floor', a.floor || '—']].map(([l, v]) => (
                        <div key={l} className="rounded-xl bg-gray-50 p-2 text-center">
                          <p className="text-[10px] text-[var(--muted)] uppercase">{l}</p>
                          <p className="text-sm font-bold text-[var(--text)]">{v}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => discharge(a.id)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 text-white font-medium py-2.5 text-sm hover:bg-green-600 transition-colors">
                      <CheckCircle2 className="h-4 w-4" /> Discharge patient
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'admit' && (
          <div className="card p-5 space-y-3">
            <h2 className="font-display text-base font-semibold">Admit a patient</h2>
            <select className="input" value={selectedAppt} onChange={e => setSelectedAppt(e.target.value)}>
              <option value="">Select completed appointment *</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  Patient — Dr.              {a.doctors?.full_name} ({formatDate(a.scheduled_at)})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Ward *" value={ward} onChange={e => setWard(e.target.value)} />
              <input className="input" placeholder="Bed number *" value={bedNumber} onChange={e => setBedNumber(e.target.value)} />
            </div>
            <input className="input" placeholder="Floor (e.g. 2nd floor)" value={floor} onChange={e => setFloor(e.target.value)} />
            <textarea className="input resize-none h-20" placeholder="Admission notes..." value={admitNotes} onChange={e => setAdmitNotes(e.target.value)} />
            <button onClick={admitPatient} disabled={saving} className="btn-wizard w-full flex items-center justify-center gap-2">
              <Wand2 className="h-4 w-4" /> {saving ? 'Admitting...' : 'Admit patient'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
