import { useEffect, useState } from 'react'
import { Building2, Plus, Trash2, MapPin } from 'lucide-react'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', phone: '', email: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchClinics() }, [])

  const fetchClinics = async () => {
    const { data } = await supabase.from('clinics').select('*').order('created_at', { ascending: false })
    setClinics(data ?? [])
    setLoading(false)
  }

  const save = async () => {
    if (!form.name || !form.city) { toast.error('Fill required fields'); return }
    setSaving(true)
    const { error } = await supabase.from('clinics').insert({ ...form, is_active: true })
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Clinic added!'); setShowForm(false); setForm({ name: '', address: '', city: '', state: '', phone: '', email: '', description: '' }); fetchClinics() }
  }

  const remove = async (id: string) => {
    await supabase.from('clinics').update({ is_active: false }).eq('id', id)
    toast.success('Clinic deactivated')
    fetchClinics()
  }

  return (
    <AppShell title="Clinics" subtitle={`${clinics.length} clinics`}>
      <div className="space-y-4 animate-fade-up">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'Add clinic'}
        </button>

        {showForm && (
          <div className="card p-5 space-y-3">
            <h2 className="font-display text-base font-semibold">New clinic</h2>
            <input className="input" placeholder="Clinic name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <input className="input" placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="City *" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              <input className="input" placeholder="State" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <textarea className="input resize-none h-20" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <button onClick={save} disabled={saving} className="btn-primary w-full">
              {saving ? 'Saving...' : 'Add clinic'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}</div>
        ) : clinics.map(c => (
          <div key={c.id} className="card p-4 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50">
              <Building2 className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--text)]">{c.name}</p>
              <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />{c.city}{c.state ? `, ${c.state}` : ''}
              </p>
              {!c.is_active && <span className="badge bg-red-100 text-red-600 mt-1">Inactive</span>}
            </div>
            <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-600 shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
