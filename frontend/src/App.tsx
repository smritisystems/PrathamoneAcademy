/**
 * @file        App.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.app
 *
 * @author      Jawahar R. Mallah
 * @organization AITDL (AI Technology & Development Lab)
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 AITDL
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-03
 * @updated     2026-11-05
 *
 * @description Root React application component defining client-side routing, route guards, and suspense fallbacks.
 */

import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'
import NotFoundPage from './pages/NotFound'

// Lazy-load all pages for code splitting
const LoginPage = React.lazy(() => import('./pages/Login'))
const DashboardPage = React.lazy(() => import('./pages/Dashboard'))
const CoursesPage = React.lazy(() => import('./pages/Courses'))
const StandardsPage = React.lazy(() => import('./pages/Standards'))
const BatchesPage = React.lazy(() => import('./pages/Batches'))
const SubjectsPage = React.lazy(() => import('./pages/Subjects'))
const StudentsPage = React.lazy(() => import('./pages/Students'))
const StudentDetailPage = React.lazy(() => import('./pages/StudentDetail'))
const AddStudentPage = React.lazy(() => import('./pages/AddStudent'))
const AttendancePage = React.lazy(() => import('./pages/Attendance'))
const ExaminationsPage = React.lazy(() => import('./pages/Examinations'))
const FeesPage = React.lazy(() => import('./pages/Fees'))
const FeeCollectionPage = React.lazy(() => import('./pages/FeeCollection'))
const PaymentsPage = React.lazy(() => import('./pages/Payments'))
const ReceiptPage = React.lazy(() => import('./pages/Receipt'))
const ReportsPage = React.lazy(() => import('./pages/Reports'))
const UsersPage = React.lazy(() => import('./pages/Users'))
const UserProfilePage = React.lazy(() => import('./pages/UserProfile'))
const ImportFeeRegisterPage = React.lazy(() => import('./pages/ImportFeeRegister'))
const StudentDashboardPage = React.lazy(() => import('./pages/StudentDashboard'))
const AcademicWorkspacePage = React.lazy(() => import('./pages/AcademicWorkspace'))
const ImportExportPage = React.lazy(() => import('./pages/ImportExport'))
const FormsDocumentsPage = React.lazy(() => import('./pages/FormsDocuments'))
const InstallAppPage = React.lazy(() => import('./pages/InstallApp'))
const StaffManagementPage = React.lazy(() => import('./pages/StaffManagement'))
const SysAdminWorkspacePage = React.lazy(() => import('./pages/SysAdminWorkspace'))
const SettingsPage = React.lazy(() => import('./pages/Settings'))
const CommunicationPage = React.lazy(() => import('./pages/Communication'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function IndexRedirect() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  // Not authenticated — handled by PrivateRoute, but guard here too
  if (!token) return <Navigate to="/login" replace />

  // Store is hydrated: route based on role
  if (user?.role === 'student') {
    return <Navigate to="/student-portal" replace />
  }
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<IndexRedirect />} />
          <Route
            path="dashboard"
            element={
              <ErrorBoundary fallbackTitle="Dashboard error">
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="student/dashboard"
            element={
              <ErrorBoundary fallbackTitle="Student portal error">
                <Suspense fallback={<PageLoader />}>
                  <StudentDashboardPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="student-portal"
            element={
              <ErrorBoundary fallbackTitle="Student portal error">
                <Suspense fallback={<PageLoader />}>
                  <StudentDashboardPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route path="academic" element={<Suspense fallback={<PageLoader />}><AcademicWorkspacePage /></Suspense>} />
          <Route path="courses" element={<Suspense fallback={<PageLoader />}><CoursesPage /></Suspense>} />
          <Route path="standards" element={<Suspense fallback={<PageLoader />}><AcademicWorkspacePage /></Suspense>} />
          <Route path="subjects" element={<Suspense fallback={<PageLoader />}><SubjectsPage /></Suspense>} />
          <Route path="batches" element={<Suspense fallback={<PageLoader />}><AcademicWorkspacePage /></Suspense>} />
          <Route path="students" element={<Suspense fallback={<PageLoader />}><StudentsPage /></Suspense>} />
          <Route path="students/add" element={<Suspense fallback={<PageLoader />}><AddStudentPage /></Suspense>} />
          <Route path="students/:id" element={<Suspense fallback={<PageLoader />}><StudentDetailPage /></Suspense>} />
          <Route path="attendance" element={<Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>} />
          <Route path="examinations" element={<Suspense fallback={<PageLoader />}><ExaminationsPage /></Suspense>} />
          <Route path="fees" element={<Suspense fallback={<PageLoader />}><FeesPage /></Suspense>} />
          <Route path="fees/import" element={<Suspense fallback={<PageLoader />}><ImportFeeRegisterPage /></Suspense>} />
          <Route path="import/fee-register" element={<Suspense fallback={<PageLoader />}><ImportFeeRegisterPage /></Suspense>} />
          <Route path="fees/collect/:studentId" element={<Suspense fallback={<PageLoader />}><FeeCollectionPage /></Suspense>} />
          <Route path="payments" element={<Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense>} />
          <Route path="receipts/:receiptNumber" element={<Suspense fallback={<PageLoader />}><ReceiptPage /></Suspense>} />
          <Route path="receipts/payment/:paymentId" element={<Suspense fallback={<PageLoader />}><ReceiptPage /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
          <Route path="users/:id" element={<Suspense fallback={<PageLoader />}><UserProfilePage /></Suspense>} />
          <Route path="staff" element={<Suspense fallback={<PageLoader />}><StaffManagementPage /></Suspense>} />
          <Route path="sysadmin" element={<Suspense fallback={<PageLoader />}><SysAdminWorkspacePage /></Suspense>} />
          <Route path="import-export" element={<Suspense fallback={<PageLoader />}><ImportExportPage /></Suspense>} />
          <Route path="forms" element={<Suspense fallback={<PageLoader />}><FormsDocumentsPage /></Suspense>} />
          <Route path="forms-documents" element={<Suspense fallback={<PageLoader />}><FormsDocumentsPage /></Suspense>} />
          <Route path="install" element={<Suspense fallback={<PageLoader />}><InstallAppPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
          <Route path="communication" element={<Suspense fallback={<PageLoader />}><CommunicationPage /></Suspense>} />
          {/* 404 within authenticated shell */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {/* 404 outside auth shell */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  )
}
