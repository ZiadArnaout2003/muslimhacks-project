const FAQS = [
  { q: 'How do live classes work?', a: 'Classes are conducted over video conferencing (Zoom to start, with support for other providers planned). You will see a "Join Class" button on your dashboard once it becomes available.' },
  { q: 'Can I choose my child’s teacher?', a: 'Yes. You can search and filter teachers by subject, grade, language, gender, price and availability, and view their full profile before booking.' },
  { q: 'What if we can’t afford full tuition?', a: 'You can apply for financial assistance at any time. Applications are reviewed individually and confidentially — see the Financial Assistance page for details.' },
  { q: 'Is the curriculum recognized everywhere?', a: 'Our academic programs are structured around recognized international standards with transparent objectives and assessment. We do not claim automatic recognition by every university — recognition varies by institution and country.' },
  { q: 'How are teachers verified?', a: 'Every teacher submits qualifications, certificates and a resume, which our administration team reviews before approval. Documents are never shown publicly.' },
  { q: 'How is Islamic content reviewed?', a: 'Islamic courses and materials go through review by a qualified Islamic scholar/reviewer before publication, in addition to standard admin oversight.' },
]

export function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
      <div className="mt-8 divide-y divide-gray-200 rounded-xl border border-black/5 bg-white">
        {FAQS.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="cursor-pointer list-none font-medium text-gray-900 group-open:text-brand-700">
              {f.q}
            </summary>
            <p className="mt-2 text-sm text-gray-600">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
