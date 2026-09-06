import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Profile, UserRole } from '../types/database'
import { getAuthErrorMessage } from '../lib/authErrors'

interface SignUpInput {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  emergencyGuardianPhone: string
  country: string
  currentGrade: string
  academicLevel: string
  islamicEducationLevel: string
  preferredLanguage: string
}

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: UserRole | null }>
  signUp: (input: SignUpInput) => Promise<{ error: string | null; sessionCreated: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    const nextProfile = data as Profile | null
    setProfile(nextProfile)
    return nextProfile
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user.id) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user.id) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message, role: null }
    if (!data.user) return { error: 'Unable to load authenticated user.', role: null }

    const nextProfile = await loadProfile(data.user.id)
    if (!nextProfile) return { error: 'Unable to load account profile.', role: null }
    return { error: null, role: nextProfile.role }
  }

  const signUp: AuthContextValue['signUp'] = async (input) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          role: 'student',
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
          emergency_guardian_phone: input.emergencyGuardianPhone,
          country: input.country,
          current_grade: input.currentGrade,
          academic_level: input.academicLevel,
          islamic_education_level: input.islamicEducationLevel,
          preferred_language: input.preferredLanguage,
        },
      },
    })
    if (error) return { error: getAuthErrorMessage(error), sessionCreated: false }

    // Supabase intentionally returns a synthetic user with no identities for an
    // already-registered email so callers cannot enumerate accounts.
    if (!data.user || data.user.identities?.length === 0) {
      return { error: 'An account with this email already exists. Please log in instead.', sessionCreated: false }
    }

    return { error: null, sessionCreated: Boolean(data.session) }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (session?.user.id) await loadProfile(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
