import type { ReactNode } from 'react'

function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <div className="prose prose-sm mt-6 max-w-none text-gray-600">{children}</div>
    </div>
  )
}

export function AboutPage() {
  return (
    <StaticPage title="About Al-Noor International School">
      <p>
        Al-Noor International School is an online international Islamic school providing both internationally
        transferable academic education and Islamic education, taught live by qualified, verified teachers to
        students around the world.
      </p>
      <p>
        Our philosophy: provide accessible, high-quality academic and Islamic education through qualified
        teachers, flexible online learning, internationally transferable curricula, and financial assistance for
        students who need it.
      </p>
    </StaticPage>
  )
}

export function ContactPage() {
  return (
    <StaticPage title="Contact Us">
      <p>Have a question about enrollment, teaching, or financial assistance? Reach out to our admissions team.</p>
      <p>Email: admissions@alnoor.school</p>
    </StaticPage>
  )
}

export function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy">
      <p>
        We collect only the information necessary to operate the platform: account details, enrollment records,
        class scheduling, and — where relevant — financial assistance details you choose to share with us.
      </p>
      <p>
        Student contact information and financial details are never made public. Teacher identification
        documents are visible only to authorized administrators. Access to family data is restricted so that
        parents can only see their own children's information.
      </p>
    </StaticPage>
  )
}

export function TermsPage() {
  return (
    <StaticPage title="Terms of Service">
      <p>
        By using this platform you agree to use it respectfully, to keep your account credentials secure, and to
        provide accurate information during registration, teacher applications, and financial assistance
        requests.
      </p>
    </StaticPage>
  )
}
