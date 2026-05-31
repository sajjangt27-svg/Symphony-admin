import { useEffect, useState } from 'react'
import { Stethoscope, Plus, Trash2, User, Star } from 'lucide-react'
import { AppShell } from '@/components/symphony/AppShell'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ full_name: '', specialty: '', qualification: '', experience_years: '', consultation_fee_cents: '', bio: '', clinic_id: '', category_id: '' })
  const [clinics, setClinics] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [docs, cls, cats] = await Promise.all([
      supabase.from('doctors').select('*, clinics(name), categories(name)').order('created_at', { ascending: false }),
      supabase.from('clinics').select('id, name'),
      supabase.from('categories').select('id, name'),
    ])
    setDoctors(docs.data ?? [])
    setClinics(cls.data ?? [])
    setCategories(cats.data ?? [])
    setLoading(false)
  }

  const save = async () => {
    if (!form.full_name || !form.specialty) { toast.error('Fill required fields'); return }
    setSaving(true)
    const { error } = await supabase.from('doctors').insert({
      ...form,
      experience_years: Number(form.experience_years),
      consultation_fee_cents: Math.round(Number(form.consultation_fee_cents) * 100),
      is_active: true,
    })
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Doctor added!'); setShowForm(false); setForm({ full_name: '', specialty: '', qualification: '', experience_years: '', consultation_fee_cents: '', bio: '', clinic_id: '', category_id: '' }); fetchAll() }
  }

  const remove = async (id: string) => {
    await supabase.from('doctors').update({ is_active: false }).eq('id', id)
    toast.success('Doctor deactivated')
    fetchAll()
  }

  return (
    <AppShell title="Doctors" subtitle={`${doctors.length} registered doctors`}>
      <div className="space-y-4 animate-fade-up">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'Add doctor'}
        </button>

        {showForm && (
          <div className="card p-5 space-y-3">
            <h2 className="font-display text-base font-semibold">New doctor</h2>
            <input className="input" placeholder="Full name *" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
            <input className="input" placeholder="Specialty *" value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} />
            <input className="input" placeholder="Qualification" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="number" placeholder="Experience (years)" value={form.experience_years} onChange={e => setForm({...form, experience_years: e.target.value})} />
              <input className="input" type="number" placeholder="Fee (₹)" value={form.consultation_fee_cents} onChange={e => setForm({...form, consultation_fee_cents: e.target.value})} />
            </div>
            <select className="input" value={form.clinic_id} onChange={e => setForm({...form, clinic_id: e.target.value})}>
              <option value="">Select clinic</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <textarea className="input resize-none h-20" placeholder="Bio" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} />
            <button onClick={save} disabled={saving} className="btn-primary w-full">
              {saving ? 'Saving...' : 'Add doctor'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}</div>
        ) : doctors.map(d => (
          <div key={d.id} className="card p-4 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)]">
              <User className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--text)]">Dr. {d.full_name}</p>
              <p className="text-xs text-[var(--muted)]">{d.specialty} · {d.clinics?.name}</p>
              <p className="text-xs text-[var(--primary)] font-medium mt-0.5">{formatCurrency(d.consultation_fee_cents)}</p>
            </div>
            <button onClick={() => remove(d.id)} className="text-red-400 hover:text-red-600 shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
