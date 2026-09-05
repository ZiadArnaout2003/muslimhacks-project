import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PublicLayout } from './components/layout/PublicLayout'
import { DashboardShell } from './components/layout/DashboardShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { PlaceholderPage } from './components/layout/PlaceholderPage'

import { HomePage } from './pages/public/HomePage'
import { TeacherSearchPage } from './pages/public/TeacherSearchPage'
import { TeacherProfilePage } from './pages/public/TeacherProfilePage'
import { CourseCataloguePage } from './pages/public/CourseCataloguePage'
import { CourseDetailsPage } from './pages/public/CourseDetailsPage'
import { CurriculumPage } from './pages/public/CurriculumPage'
import { FinancialAssistanceInfoPage } from './pages/public/FinancialAssistanceInfoPage'
import { FAQPage } from './pages/public/FAQPage'
import { PricingPage } from './pages/public/PricingPage'
import { AboutPage, ContactPage, PrivacyPage, TermsPage } from './pages/public/StaticPages'

import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { TeacherApplyPage } from './pages/auth/TeacherApplyPage'

import { ParentOnboardingPage } from './pages/parent/ParentOnboardingPage'
import { ParentDashboardPage } from './pages/parent/ParentDashboardPage'
import { ParentChildrenPage } from './pages/parent/ParentChildrenPage'
import { ParentBookingsPage } from './pages/parent/ParentBookingsPage'
import { BookingPage } from './pages/parent/BookingPage'
import { CheckoutPage } from './pages/parent/CheckoutPage'
import { PaymentHistoryPage } from './pages/parent/PaymentHistoryPage'
import { FinancialAssistanceApplyPage } from './pages/parent/FinancialAssistanceApplyPage'

import { StudentDashboardPage } from './pages/student/StudentDashboardPage'
import { StudentCoursesPage } from './pages/student/StudentCoursesPage'
import { CourseLearningPage } from './pages/student/CourseLearningPage'
import { AssignmentsPage } from './pages/student/AssignmentsPage'
import { AssignmentSubmissionPage } from './pages/student/AssignmentSubmissionPage'
import { QuizPage } from './pages/student/QuizPage'
import { ProgressPage } from './pages/student/ProgressPage'

import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage'
import { TeacherApplicationStatusPage } from './pages/teacher/TeacherApplicationStatusPage'
import { TeacherCoursesListPage } from './pages/teacher/TeacherCoursesListPage'
import { TeacherCourseEditorPage } from './pages/teacher/TeacherCourseEditorPage'
import { TeacherAvailabilityPage } from './pages/teacher/TeacherAvailabilityPage'
import { TeacherClassesPage } from './pages/teacher/TeacherClassesPage'

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminTeacherManagementPage } from './pages/admin/AdminTeacherManagementPage'
import { AdminStudentManagementPage } from './pages/admin/AdminStudentManagementPage'
import { AdminCourseManagementPage } from './pages/admin/AdminCourseManagementPage'
import { AdminFinancialAssistanceManagementPage } from './pages/admin/AdminFinancialAssistanceManagementPage'
import { AdminScheduleManagementPage } from './pages/admin/AdminScheduleManagementPage'
import { AdminReportsPage } from './pages/admin/AdminReportsPage'

import { SettingsPage } from './pages/shared/SettingsPage'

import './i18n'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/apply-to-teach" element={<TeacherApplyPage />} />
            <Route path="/teachers" element={<TeacherSearchPage />} />
            <Route path="/teachers/:teacherId" element={<TeacherProfilePage />} />
            <Route path="/courses" element={<CourseCataloguePage />} />
            <Route path="/courses/:courseId" element={<CourseDetailsPage />} />
            <Route path="/islamic-studies" element={<CourseCataloguePage />} />
            <Route path="/curriculum" element={<CurriculumPage />} />
            <Route path="/financial-assistance" element={<FinancialAssistanceInfoPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>

          {/* Parent onboarding + standalone flows (no sidebar) */}
          <Route element={<ProtectedRoute allow={['parent']} />}>
            <Route path="/parent/onboarding" element={<ParentOnboardingPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Route>

          {/* Parent dashboard */}
          <Route element={<ProtectedRoute allow={['parent']} />}>
            <Route element={<DashboardShell />}>
              <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
              <Route path="/parent/children" element={<ParentChildrenPage />} />
              <Route path="/parent/bookings" element={<ParentBookingsPage />} />
              <Route path="/parent/payments" element={<PaymentHistoryPage />} />
              <Route path="/parent/financial-assistance" element={<FinancialAssistanceApplyPage />} />
              <Route path="/parent/messages" element={<PlaceholderPage title="Messages" />} />
            </Route>
          </Route>

          {/* Student dashboard */}
          <Route element={<ProtectedRoute allow={['student']} />}>
            <Route element={<DashboardShell />}>
              <Route path="/student/dashboard" element={<StudentDashboardPage />} />
              <Route path="/student/courses" element={<StudentCoursesPage />} />
              <Route path="/student/courses/:courseId" element={<CourseLearningPage />} />
              <Route path="/student/assignments" element={<AssignmentsPage />} />
              <Route path="/student/assignments/:assignmentId" element={<AssignmentSubmissionPage />} />
              <Route path="/student/quiz/:quizId" element={<QuizPage />} />
              <Route path="/student/progress" element={<ProgressPage />} />
            </Route>
          </Route>

          {/* Teacher dashboard */}
          <Route element={<ProtectedRoute allow={['teacher']} />}>
            <Route element={<DashboardShell />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
              <Route path="/teacher/application-status" element={<TeacherApplicationStatusPage />} />
              <Route path="/teacher/courses" element={<TeacherCoursesListPage />} />
              <Route path="/teacher/courses/:courseId" element={<TeacherCourseEditorPage />} />
              <Route path="/teacher/availability" element={<TeacherAvailabilityPage />} />
              <Route path="/teacher/classes" element={<TeacherClassesPage />} />
            </Route>
          </Route>

          {/* Admin dashboard */}
          <Route element={<ProtectedRoute allow={['admin']} />}>
            <Route element={<DashboardShell />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/teachers" element={<AdminTeacherManagementPage />} />
              <Route path="/admin/students" element={<AdminStudentManagementPage />} />
              <Route path="/admin/courses" element={<AdminCourseManagementPage />} />
              <Route path="/admin/financial-assistance" element={<AdminFinancialAssistanceManagementPage />} />
              <Route path="/admin/schedule" element={<AdminScheduleManagementPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
            </Route>
          </Route>

          {/* Scholar (Islamic content review) */}
          <Route element={<ProtectedRoute allow={['scholar', 'admin']} />}>
            <Route element={<DashboardShell />}>
              <Route path="/admin/islamic-review" element={<PlaceholderPage title="Islamic Content Review" note="Route, layout and RLS (islamic_content_reviews table, scholar role) are in place; the review queue UI is a Tier 2 build-out." />} />
            </Route>
          </Route>

          {/* Shared settings — any authenticated role */}
          <Route element={<ProtectedRoute allow={['parent', 'student', 'teacher', 'admin', 'scholar']} />}>
            <Route element={<DashboardShell />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
