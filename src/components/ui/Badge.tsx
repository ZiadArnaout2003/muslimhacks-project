import type { ReactNode } from 'react'
import clsx from 'clsx'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  brand: 'bg-brand-100 text-brand-800',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', toneClasses[tone])}>
      {children}
    </span>
  )
}
