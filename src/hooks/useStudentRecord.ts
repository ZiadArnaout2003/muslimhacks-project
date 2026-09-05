import { supabase } from '../lib/supabaseClient'
import { useSupabaseQuery } from './useSupabaseQuery'
import { useAuth } from '../contexts/AuthContext'
import type { Student } from '../types/database'

/** Resolves the `students` row for the logged-in student account. */
export function useStudentRecord() {
  const { session } = useAuth()
  const { data, loading, error } = useSupabaseQuery<Student>(
    () => supabase.from('students').select('*').eq('profile_id', session?.user.id ?? '').maybeSingle(),
    [session?.user.id]
  )
  return { student: data, loading, error }
}
