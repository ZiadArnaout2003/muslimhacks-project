import { Link } from 'react-router-dom'
import { HandHeart, ShieldCheck, ClipboardList } from 'lucide-react'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function FinancialAssistanceInfoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <HandHeart className="h-10 w-10 text-gold-600" />
      <h1 className="mt-4 text-3xl font-bold text-gray-900">Financial Assistance</h1>
      <p className="mt-3 text-gray-600">
        No student should be denied a quality education because their family cannot afford full tuition.
        Families may request a <strong>partial fee reduction</strong> or a <strong>full fee exemption</strong>.
        Every application is reviewed individually and confidentially by our administration team.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Card>
          <CardBody>
            <ClipboardList className="h-6 w-6 text-brand-600" />
            <h3 className="mt-2 font-semibold text-gray-900">Apply</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tell us about your household situation. We only ask for what's needed to evaluate your request.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            <h3 className="mt-2 font-semibold text-gray-900">Reviewed Privately</h3>
            <p className="mt-1 text-sm text-gray-500">
              An administrator reviews your case individually. Your family is never publicly identified by
              financial status.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <HandHeart className="h-6 w-6 text-brand-600" />
            <h3 className="mt-2 font-semibold text-gray-900">Reduced Tuition</h3>
            <p className="mt-1 text-sm text-gray-500">
              If approved, your reduced tuition amount is automatically applied at checkout.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-10 rounded-xl bg-brand-50 p-6">
        <h2 className="font-semibold text-gray-900">Ready to apply?</h2>
        <p className="mt-1 text-sm text-gray-600">
          You'll need a parent account first so we can link the application to your child's enrollment.
        </p>
        <div className="mt-4 flex gap-3">
          <Link to="/parent/financial-assistance">
            <Button>Apply for Assistance</Button>
          </Link>
          <Link to="/register">
            <Button variant="outline">Create an Account First</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
