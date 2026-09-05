import { useEffect, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'

/** Runs a Supabase query on mount / whenever deps change, with loading+error state. */
export function useSupabaseQuery<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    queryFn().then((res) => {
      if (cancelled) return
      if (res.error) setError(res.error.message)
      else setData(res.data)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
