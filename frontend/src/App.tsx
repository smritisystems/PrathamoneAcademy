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
 * @updated     2026-11-08
 *
 * @description Root React application component defining client-side routing, route guards, and suspense fallbacks.
 */

import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineBanner } from './components/OfflineBanner'
import { lazyWithRetry } from './utils/lazyWithRetry'
import Layout from './components/Layout'
import NotFoundPage from './pages/NotFound'

// Lazy-load all pages for code splitting
const LoginPage = lazyWithRetry(() => import('./pages/Login'), 'Login')
const DashboardPage = lazyWithRetry(() => import('./pages/Dashboard'), 'Dashboard')
const CoursesPage = lazyWithRetry(() => import('./pages/Courses'), 'Courses')
const StandardsPage = lazyWithRetry(() => import('./pages/Standards'), 'Standards')
const BatchesPage = lazyWithRetry(() => import('./pages/Batches'), 'Batches')
const SubjectsPage = lazyWithRetry(() => import('./pages/Subjects'), 'Subjects')
const StudentsPage = lazyWithRetry(() => import('./pages/Students'), 'Students')
const StudentDetailPage = lazyWithRetry(() => import('./pages/StudentDetail'), 'StudentDetail')
const AddStudentPage = lazyWithRetry(() => import('./pages/AddStudent'), 'AddStudent')
const AttendancePage = lazyWithRetry(() => import('./pages/Attendance'), 'Attendance')
const ExaminationsPage = lazyWithRetry(() => import('./pages/Examinations'), 'Examinations')
const FeesPage = lazyWithRetry(() => import('./pages/Fees'), 'Fees')
const FeeCollectionPage = lazyWithRetry(() => import('./pages/FeeCollection'), 'FeeCollection')
const PaymentsPage = lazyWithRetry(() => import('./pages/Payments'), 'Payments')
const ReceiptPage = lazyWithRetry(() => import('./pages/Receipt'), 'Receipt')
const ReportsPage = lazyWithRetry(() => import('./pages/Reports'), 'Reports')
const UsersPage = lazyWithRetry(() => import('./pages/Users'), 'Users')
const UserProfilePage = lazyWithRetry(() => import('./pages/UserProfile'), 'UserProfile')
const ImportFeeRegisterPage = lazyWithRetry(() => import('./pages/ImportFeeRegister'), 'ImportFeeRegister')
const StudentDashboardPage = lazyWithRetry(() => import('./pages/StudentDashboard'), 'StudentDashboard')
const AcademicWorkspacePage = lazyWithRetry(() => import('./pages/AcademicWorkspace'), 'AcademicWorkspace')
const ImportExportPage = lazyWithRetry(() => import('./pages/ImportExport'), 'ImportExport')
const FormsDocumentsPage = lazyWithRetry(() => import('./pages/FormsDocuments'), 'FormsDocuments')
const InstallAppPage = lazyWithRetry(() => import('./pages/InstallApp'), 'InstallApp')
const StaffManagementPage = lazyWithRetry(() => import('./pages/StaffManagement'), 'StaffManagement')
const TeacherManagementPage = lazyWithRetry(() => import('./pages/TeacherManagement'), 'TeacherManagement')
const TeacherProfilePage = lazyWithRetry(() => import('./pages/TeacherProfilePage'), 'TeacherProfilePage')
const StaffProfilePage = lazyWithRetry(() => import('./pages/StaffProfilePage'), 'StaffProfilePage')
const TeacherPayrollPage = lazyWithRetry(() => import('./pages/TeacherPayroll'), 'TeacherPayroll')
const SysAdminWorkspacePage = lazyWithRetry(() => import('./pages/SysAdminWorkspace'), 'SysAdminWorkspace')
const SettingsPage = lazyWithRetry(() => import('./pages/Settings'), 'Settings')
const CommunicationPage = lazyWithRetry(() => import('./pages/Communication'), 'Communication')
const ReleasesPage = lazyWithRetry(() => import('./pages/Releases'), 'Releases')
const CodeXStudioPage = lazyWithRetry(() => import('./pages/CodeXStudio'), 'CodeXStudio')
const LeadManagementPage = lazyWithRetry(() => import('./pages/LeadManagement'), 'LeadManagement')
const CrmOverviewPage = lazyWithRetry(() => import('./pages/crm/CrmOverviewPage'), 'CrmOverviewPage')
const LeadRegisterPage = lazyWithRetry(() => import('./pages/crm/LeadRegisterPage'), 'LeadRegisterPage')
const LeadPipelinePage = lazyWithRetry(() => import('./pages/crm/LeadPipelinePage'), 'LeadPipelinePage')
const FollowUpCentrePage = lazyWithRetry(() => import('./pages/crm/FollowUpCentrePage'), 'FollowUpCentrePage')
const CounsellingDemoPage = lazyWithRetry(() => import('./pages/crm/CounsellingDemoPage'), 'CounsellingDemoPage')
const LeadSourcesPage = lazyWithRetry(() => import('./pages/crm/LeadSourcesPage'), 'LeadSourcesPage')
const CampaignsPage = lazyWithRetry(() => import('./pages/crm/CampaignsPage'), 'CampaignsPage')
const CrmReportsPage = lazyWithRetry(() => import('./pages/crm/CrmReportsPage'), 'CrmReportsPage')
const CrmSettingsPage = lazyWithRetry(() => import('./pages/crm/CrmSettingsPage'), 'CrmSettingsPage')
const TrainingManagementPage = lazyWithRetry(() => import('./pages/TrainingManagement'), 'TrainingManagement')

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'student') {
    return <Navigate to="/student-portal" replace />
  }
  return <>{children}</>
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
      <OfflineBanner />
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
              <StaffRoute>
                <ErrorBoundary fallbackTitle="Dashboard error">
                  <Suspense fallback={<PageLoader />}>
                    <DashboardPage />
                  </Suspense>
                </ErrorBoundary>
              </StaffRoute>
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
            {/* Lead Management & CRM Dedicated Workspaces */}
            <Route path="leads" element={<Suspense fallback={<PageLoader />}><LeadManagementPage /></Suspense>} />
            <Route path="crm" element={<Suspense fallback={<PageLoader />}><LeadManagementPage /></Suspense>} />
            <Route path="leads/overview" element={<Suspense fallback={<PageLoader />}><CrmOverviewPage /></Suspense>} />
            <Route path="crm/overview" element={<Suspense fallback={<PageLoader />}><CrmOverviewPage /></Suspense>} />
            <Route path="leads/all" element={<Suspense fallback={<PageLoader />}><LeadRegisterPage /></Suspense>} />
            <Route path="crm/leads" element={<Suspense fallback={<PageLoader />}><LeadRegisterPage /></Suspense>} />
            <Route path="leads/pipeline" element={<Suspense fallback={<PageLoader />}><LeadPipelinePage /></Suspense>} />
            <Route path="crm/pipeline" element={<Suspense fallback={<PageLoader />}><LeadPipelinePage /></Suspense>} />
            <Route path="leads/follow-ups" element={<Suspense fallback={<PageLoader />}><FollowUpCentrePage /></Suspense>} />
            <Route path="leads/followups" element={<Suspense fallback={<PageLoader />}><FollowUpCentrePage /></Suspense>} />
            <Route path="crm/follow-ups" element={<Suspense fallback={<PageLoader />}><FollowUpCentrePage /></Suspense>} />
            <Route path="leads/counselling" element={<Suspense fallback={<PageLoader />}><CounsellingDemoPage /></Suspense>} />
            <Route path="leads/demo" element={<Suspense fallback={<PageLoader />}><CounsellingDemoPage /></Suspense>} />
            <Route path="crm/counselling" element={<Suspense fallback={<PageLoader />}><CounsellingDemoPage /></Suspense>} />
            <Route path="leads/sources" element={<Suspense fallback={<PageLoader />}><LeadSourcesPage /></Suspense>} />
            <Route path="crm/sources" element={<Suspense fallback={<PageLoader />}><LeadSourcesPage /></Suspense>} />
            <Route path="leads/campaigns" element={<Suspense fallback={<PageLoader />}><CampaignsPage /></Suspense>} />
            <Route path="crm/campaigns" element={<Suspense fallback={<PageLoader />}><CampaignsPage /></Suspense>} />
            <Route path="leads/reports" element={<Suspense fallback={<PageLoader />}><CrmReportsPage /></Suspense>} />
            <Route path="crm/reports" element={<Suspense fallback={<PageLoader />}><CrmReportsPage /></Suspense>} />
            <Route path="leads/settings" element={<Suspense fallback={<PageLoader />}><CrmSettingsPage /></Suspense>} />
            <Route path="crm/settings" element={<Suspense fallback={<PageLoader />}><CrmSettingsPage /></Suspense>} />
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
          <Route path="teachers" element={<Suspense fallback={<PageLoader />}><TeacherManagementPage /></Suspense>} />
          <Route path="teachers/:id" element={<Suspense fallback={<PageLoader />}><TeacherProfilePage /></Suspense>} />
          <Route path="teacher-management" element={<Suspense fallback={<PageLoader />}><TeacherManagementPage /></Suspense>} />
          <Route path="staff" element={<Suspense fallback={<PageLoader />}><StaffManagementPage /></Suspense>} />
          <Route path="staff/:id" element={<Suspense fallback={<PageLoader />}><StaffProfilePage /></Suspense>} />
          <Route path="teacher-payroll" element={<Suspense fallback={<PageLoader />}><TeacherPayrollPage /></Suspense>} />
          <Route path="payroll" element={<Suspense fallback={<PageLoader />}><TeacherPayrollPage /></Suspense>} />
          <Route path="sysadmin" element={<Suspense fallback={<PageLoader />}><SysAdminWorkspacePage /></Suspense>} />
          <Route path="import-export" element={<Suspense fallback={<PageLoader />}><ImportExportPage /></Suspense>} />
          <Route path="forms" element={<Suspense fallback={<PageLoader />}><FormsDocumentsPage /></Suspense>} />
          <Route path="forms-documents" element={<Suspense fallback={<PageLoader />}><FormsDocumentsPage /></Suspense>} />
          <Route path="install" element={<Suspense fallback={<PageLoader />}><InstallAppPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
          <Route path="codex" element={<Suspense fallback={<PageLoader />}><CodeXStudioPage /></Suspense>} />
          <Route path="communication" element={<Suspense fallback={<PageLoader />}><CommunicationPage /></Suspense>} />
          <Route path="releases" element={<Suspense fallback={<PageLoader />}><ReleasesPage /></Suspense>} />
          <Route path="admin/releases" element={<Suspense fallback={<PageLoader />}><ReleasesPage /></Suspense>} />
          <Route path="training" element={<Suspense fallback={<PageLoader />}><TrainingManagementPage /></Suspense>} />
          <Route path="admin/training" element={<Suspense fallback={<PageLoader />}><TrainingManagementPage /></Suspense>} />
          {/* 404 within authenticated shell */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {/* 404 outside auth shell */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  )
}
