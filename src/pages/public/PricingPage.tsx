import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const TIERS = [
  { name: 'Standard', price: 'Full tuition', desc: 'Full tuition pricing, set per teacher/course.', features: ['Full access to booked classes', 'All course materials', 'Progress tracking'] },
  { name: 'Supported', price: 'Reduced', desc: 'A reduced rate for eligible students, set case-by-case.', features: ['Same access as Standard', 'Reduced rate applied automatically at checkout'] },
  { name: 'Sponsored', price: 'Sponsor-funded', desc: 'Tuition partially or fully covered through a sponsorship program.', features: ['Same access as Standard', 'Funded by school sponsorship programs'] },
]

export function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">Tuition & Payment Options</h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        We offer flexible tuition tiers so cost is never a barrier. A family's tuition tier is never shown
        publicly or to other families — it's private between you and the school.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {TIERS.map((t) => (
          <Card key={t.name}>
            <CardBody>
              <h3 className="font-semibold text-gray-900">{t.name}</h3>
              <p className="mt-1 text-2xl font-bold text-brand-700">{t.price}</p>
              <p className="mt-2 text-sm text-gray-500">{t.desc}</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-xl bg-gold-50 p-6 text-center">
        <h2 className="font-semibold text-gray-900">Can't afford tuition right now?</h2>
        <p className="mt-1 text-sm text-gray-600">Apply for financial assistance — every request is reviewed individually.</p>
        <Link to="/financial-assistance" className="mt-4 inline-block">
          <Button variant="secondary">Learn About Financial Assistance</Button>
        </Link>
      </div>
    </div>
  )
}
