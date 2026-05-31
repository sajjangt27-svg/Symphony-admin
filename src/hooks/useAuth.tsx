import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Role = 'admin' | 'wizard' | null

interface AuthCtx {
  user: User | null
  session: Session | null
  loading: boolean
  role: Role
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<Role>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s); setUser(s?.user ?? null)
      if (s?.user) fetchRole(s.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s); setUser(s?.user ?? null)
      if (s?.user) fetchRole(s.user.id)
      else { setRole(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchRole = async (userId: string) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
    setRole((data?.role as Role) ?? 'admin')
    setLoading(false)
  }

  const signOut = async () => { await supabase.auth.signOut() }

  return <Ctx.Provider value={{ user, session, loading, role, signOut }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
