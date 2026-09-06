import { Bell } from 'lucide-react'
import { Card, CardBody } from '../ui/Card'

export interface DashboardAnnouncement {
  id: string
  title: string
  body: string
  created_at: string
  courses: { title: string } | null
}

export function DashboardAnnouncements({
  heading,
  announcements,
}: {
  heading: string
  announcements: DashboardAnnouncement[]
}) {
  if (announcements.length === 0) return null

  return (
    <Card>
      <CardBody>
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Bell className="h-4 w-4" /> {heading}
        </h2>
        <div className="mt-3 space-y-3">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="rounded-lg bg-gray-50 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{announcement.title}</p>
                  {announcement.courses?.title && (
                    <p className="text-xs text-brand-700">{announcement.courses.title}</p>
                  )}
                </div>
                <time className="text-xs text-gray-400">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{announcement.body}</p>
            </article>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}