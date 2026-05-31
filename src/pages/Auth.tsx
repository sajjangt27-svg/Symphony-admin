import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music2, Eye, EyeOff, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export default function AuthPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Please fill all fields'); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('Welcome to Symphony Admin!')
    } catch (err: any) {
      toast.error(err.message || 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)]">
              <Music2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-[var(--text)]">Symphony</p>
              <p className="text-xs text-[var(--muted)] -mt-0.5">Admin Portal</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-[var(--primary-soft)]">
            <Shield className="h-5 w-5 text-[var(--primary)] shrink-0" />
            <p className="text-sm text-[var(--primary)] font-medium">Admin & Wizard access only</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
              <input className="input" type="email" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full mt-2">
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
