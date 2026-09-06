import type { UserRole } from '../types/database'

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case 'student':
      return '/student/dashboard'
    case 'teacher':
      return '/teacher/dashboard'
    case 'admin':
      return '/admin/dashboard'
    case 'scholar':
      return '/admin/islamic-review'
    default:
      return '/'
  }
}
