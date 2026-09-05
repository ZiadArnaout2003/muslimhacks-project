import { Construction } from 'lucide-react'

export function PlaceholderPage({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <Construction className="mx-auto h-10 w-10 text-gold-500" />
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {note ?? 'This area is scaffolded (route + layout + access control) but the full feature is a Tier 2/3 build-out beyond this pass.'}
      </p>
    </div>
  )
}
