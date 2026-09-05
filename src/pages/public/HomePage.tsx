import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  GraduationCap,
  Globe2,
  BookOpenCheck,
  Video,
  CalendarClock,
  Wallet,
  HandHeart,
  Star,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'
import { Button } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import type { Course, Subject } from '../../types/database'

const WHY_US = [
  { icon: GraduationCap, title: 'Qualified Teachers', desc: 'Every teacher is verified and their credentials reviewed before they teach.' },
  { icon: Globe2, title: 'International Curriculum', desc: 'Structured around recognized international standards with transparent credentialing.' },
  { icon: BookOpenCheck, title: 'Islamic Education', desc: 'Qur’an, Aqeedah, Fiqh, Seerah and more, taught with scholarly oversight.' },
  { icon: Video, title: 'Live Online Classes', desc: 'Interactive live sessions plus recorded lessons you can revisit anytime.' },
  { icon: CalendarClock, title: 'Flexible Scheduling', desc: 'Book classes around your family’s timezone and daily routine.' },
  { icon: Wallet, title: 'Affordable Tuition', desc: 'Multiple tuition tiers so cost never has to be a barrier to learning.' },
  { icon: HandHeart, title: 'Financial Assistance', desc: 'Families who can’t afford full tuition can apply for partial or full support.' },
]

const HOW_IT_WORKS = [
  'Create an account',
  'Add your child',
  'Explore teachers & courses',
  'Select a schedule',
  'Enroll',
  'Start learning',
]

const TESTIMONIALS = [
  { name: 'Amina K.', role: 'Parent, Toronto', quote: 'My son’s Qur’an teacher is patient and genuinely cares. The scheduling around our timezone made it effortless.' },
  { name: 'Yusuf A.', role: 'Parent, London', quote: 'The financial assistance process was respectful and quick. My daughter never felt singled out.' },
  { name: 'Sara M.', role: 'Student, Grade 10', quote: 'I like that I can rewatch my Physics lessons before quizzes. My grades have really improved.' },
]

export function HomePage() {
  const { t } = useTranslation()

  const { data: subjects } = useSupabaseQuery<Subject[]>(
    () => supabase.from('subjects').select('*').order('name'),
    []
  )

  const { data: courses } = useSupabaseQuery<Course[]>(
    () =>
      supabase
        .from('courses')
        .select('*')
        .eq('status', 'published')
        .eq('delivery_mode', 'recorded')
        .limit(3),
    []
  )

  const academicSubjects = subjects?.filter((s) => s.category === 'academic') ?? []
  const islamicSubjects = subjects?.filter((s) => s.category === 'islamic') ?? []

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('hero.headline')}</h1>
            <p className="mt-5 text-lg text-brand-100">{t('hero.subheadline')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses">
                <Button size="lg" variant="secondary">
                  {t('hero.exploreCourses')}
                </Button>
              </Link>
              <Link to="/teachers">
                <Button size="lg" className="bg-white text-brand-800 hover:bg-brand-50">
                  {t('hero.findTeacher')}
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  {t('hero.enrollChild')}
                </Button>
              </Link>
              <Link to="/apply-to-teach">
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                  {t('hero.applyTeacher')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Why Families Choose Us</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_US.map((item) => (
            <Card key={item.title}>
              <CardBody>
                <item.icon className="h-8 w-8 text-brand-600" />
                <h3 className="mt-3 font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Subjects We Teach</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-600">Academic</h3>
              <div className="flex flex-wrap gap-2">
                {academicSubjects.map((s) => (
                  <Badge key={s.id} tone="brand">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold-700">Islamic</h3>
              <div className="flex flex-wrap gap-2">
                {islamicSubjects.map((s) => (
                  <Badge key={s.id} tone="warning">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">How It Works</h2>
        <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step} className="rounded-xl border border-black/5 bg-white p-4 text-center shadow-sm">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </div>
              <p className="text-sm font-medium text-gray-700">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Financial assistance */}
      <section className="bg-gold-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <HandHeart className="mx-auto h-10 w-10 text-gold-700" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Financial Assistance Available</h2>
          <p className="mt-3 text-gray-600">
            No student should miss out on a quality education because of cost. Families who cannot afford full
            tuition can apply for partial or full financial assistance — every application is reviewed
            individually and confidentially.
          </p>
          <Link to="/financial-assistance" className="mt-6 inline-block">
            <Button variant="secondary">Learn About Financial Assistance</Button>
          </Link>
        </div>
      </section>

      {/* Recorded courses */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Featured Recorded Courses</h2>
          <Link to="/courses" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((c) => (
            <Card key={c.id}>
              <CardBody>
                <Badge tone={c.is_islamic ? 'warning' : 'brand'}>{c.is_islamic ? 'Islamic' : 'Academic'}</Badge>
                <h3 className="mt-3 font-semibold text-gray-900">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">{c.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold text-brand-700">${c.price}</span>
                  <Link to={`/courses/${c.id}`}>
                    <Button size="sm" variant="outline">
                      View Course
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
          {courses?.length === 0 && <p className="text-sm text-gray-500">No recorded courses published yet.</p>}
        </div>
      </section>

      {/* Teacher recruitment */}
      <section className="bg-brand-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Are you a qualified teacher?</h2>
          <p className="mt-3 text-brand-100">
            Join a global community of academic and Islamic educators teaching students across the world.
          </p>
          <Link to="/apply-to-teach" className="mt-6 inline-block">
            <Button size="lg" variant="secondary">
              Apply to Teach
            </Button>
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">What Families Say</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {TESTIMONIALS.map((tm) => (
            <Card key={tm.name}>
              <CardBody>
                <div className="flex gap-0.5 text-gold-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-gray-600">“{tm.quote}”</p>
                <p className="mt-4 text-sm font-semibold text-gray-900">{tm.name}</p>
                <p className="text-xs text-gray-500">{tm.role}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
