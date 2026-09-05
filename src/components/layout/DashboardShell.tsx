import { type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  HandCoins,
  GraduationCap,
  MessageSquare,
  Settings,
  Bell,
  BarChart3,
  ShieldCheck,
  Video,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../types/database'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  parent: [
    { to: '/parent/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/parent/children', label: 'My Children', icon: <Users className="h-4 w-4" /> },
    { to: '/teachers', label: 'Find a Teacher', icon: <GraduationCap className="h-4 w-4" /> },
    { to: '/parent/bookings', label: 'Bookings & Schedule', icon: <CalendarDays className="h-4 w-4" /> },
    { to: '/parent/payments', label: 'Payments & Invoices', icon: <CreditCard className="h-4 w-4" /> },
    { to: '/parent/financial-assistance', label: 'Financial Assistance', icon: <HandCoins className="h-4 w-4" /> },
    { to: '/parent/messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ],
  student: [
    { to: '/student/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/student/courses', label: 'My Courses', icon: <BookOpen className="h-4 w-4" /> },
    { to: '/student/assignments', label: 'Assignments', icon: <ClipboardList className="h-4 w-4" /> },
    { to: '/student/progress', label: 'Progress', icon: <BarChart3 className="h-4 w-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ],
  teacher: [
    { to: '/teacher/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/teacher/classes', label: 'My Classes', icon: <Video className="h-4 w-4" /> },
    { to: '/teacher/courses', label: 'My Courses', icon: <BookOpen className="h-4 w-4" /> },
    { to: '/teacher/availability', label: 'Availability', icon: <CalendarDays className="h-4 w-4" /> },
    { to: '/teacher/application-status', label: 'Application Status', icon: <ShieldCheck className="h-4 w-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/admin/teachers', label: 'Teachers', icon: <GraduationCap className="h-4 w-4" /> },
    { to: '/admin/students', label: 'Students', icon: <Users className="h-4 w-4" /> },
    { to: '/admin/courses', label: 'Courses', icon: <BookOpen className="h-4 w-4" /> },
    { to: '/admin/schedule', label: 'Schedule', icon: <CalendarDays className="h-4 w-4" /> },
    { to: '/admin/financial-assistance', label: 'Financial Assistance', icon: <HandCoins className="h-4 w-4" /> },
    { to: '/admin/reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ],
  scholar: [
    { to: '/admin/islamic-review', label: 'Content Review', icon: <ShieldCheck className="h-4 w-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ],
}

export function DashboardShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  if (!profile) return null
  const items = NAV_BY_ROLE[profile.role]

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-black/5 bg-white md:flex">
        <Link to="/" className="flex items-center gap-2 border-b border-black/5 px-5 py-4 font-semibold text-brand-800">
          <GraduationCap className="h-6 w-6 text-brand-600" />
          Al-Noor
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-brand-50 hover:text-brand-700'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-black/5 p-4 text-xs text-gray-500">
          Signed in as
          <div className="font-medium text-gray-800">
            {profile.first_name} {profile.last_name}
          </div>
          <div className="capitalize">{profile.role}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 sm:px-6">
          <span className="text-sm text-gray-500 md:hidden">Al-Noor</span>
          <div className="hidden text-sm text-gray-500 md:block" />
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:text-brand-700">
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
