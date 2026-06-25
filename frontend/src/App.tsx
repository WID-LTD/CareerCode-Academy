import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader } from '@/components/ui/Loader';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader text="Loading..." /></div>}>
      {children}
    </Suspense>
  );
}

// Public pages
const Home = lazy(() => import('@/pages/Home'));
const About = lazy(() => import('@/pages/About'));
const Courses = lazy(() => import('@/pages/Courses'));
const CourseDetails = lazy(() => import('@/pages/public/CourseDetails'));
const Checkout = lazy(() => import('@/pages/public/Checkout'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const Contact = lazy(() => import('@/pages/Contact'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const Community = lazy(() => import('@/pages/Community'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));
const VerifyPending = lazy(() => import('@/pages/VerifyPending'));
const Verified = lazy(() => import('@/pages/Verified'));
const VerificationError = lazy(() => import('@/pages/VerificationError'));
const BecomeInstructor = lazy(() => import('@/pages/BecomeInstructor'));
const Apply = lazy(() => import('@/pages/Apply'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const VerifyPayment = lazy(() => import('@/pages/VerifyPayment'));
const VerifyCertificate = lazy(() => import('@/pages/public/VerifyCertificate'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Careers = lazy(() => import('@/pages/Careers'));
const Partners = lazy(() => import('@/pages/Partners'));
const Press = lazy(() => import('@/pages/Press'));
const Help = lazy(() => import('@/pages/Help'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Cookies = lazy(() => import('@/pages/Cookies'));
const Accessibility = lazy(() => import('@/pages/Accessibility'));
const UserGuide = lazy(() => import('@/pages/Guide'));

// Student pages
const StudentDashboard = lazy(() => import('@/pages/student/Dashboard'));
const StudentMyCourses = lazy(() => import('@/pages/student/MyCourses'));
const StudentCourseView = lazy(() => import('@/pages/student/CourseView'));
const StudentAssignments = lazy(() => import('@/pages/student/Assignments'));
const StudentCertificate = lazy(() => import('@/pages/student/Certificate'));
const StudentProfile = lazy(() => import('@/pages/student/Profile'));
const StudentLearningPaths = lazy(() => import('@/pages/student/LearningPaths'));
const StudentLearningPathDetail = lazy(() => import('@/pages/student/LearningPathDetail'));
const StudentLeaderboard = lazy(() => import('@/pages/student/Leaderboard'));
const StudentCalendar = lazy(() => import('@/pages/student/Calendar'));
const StudentNotifications = lazy(() => import('@/pages/student/Notifications'));
const StudentSettings = lazy(() => import('@/pages/student/Settings'));
const StudentTickets = lazy(() => import('@/pages/student/Tickets'));
const StudentMessages = lazy(() => import('@/pages/student/Messages'));
const StudentQuizTake = lazy(() => import('@/pages/student/QuizTake'));
const StudentExamsList = lazy(() => import('@/pages/student/ExamsList'));
const StudentExamTake = lazy(() => import('@/pages/student/ExamTake'));
const StudentExamResults = lazy(() => import('@/pages/student/ExamResults'));
const StudentChallenges = lazy(() => import('@/pages/student/Challenges'));

// Instructor pages
const InstructorDashboard = lazy(() => import('@/pages/instructor/Dashboard'));
const InstructorManageCourses = lazy(() => import('@/pages/instructor/ManageCourses'));
const InstructorCourseEditor = lazy(() => import('@/pages/instructor/CourseEditor'));
const InstructorAssignments = lazy(() => import('@/pages/instructor/Assignments'));
const InstructorStudents = lazy(() => import('@/pages/instructor/Students'));
const InstructorAnalytics = lazy(() => import('@/pages/instructor/Analytics'));
const InstructorSubmissions = lazy(() => import('@/pages/instructor/Submissions'));
const InstructorAnnouncements = lazy(() => import('@/pages/instructor/Announcements'));
const InstructorLiveClasses = lazy(() => import('@/pages/instructor/LiveClasses'));
const InstructorMessages = lazy(() => import('@/pages/instructor/Messages'));
const InstructorSchedule = lazy(() => import('@/pages/instructor/Schedule'));
const InstructorCourseProposals = lazy(() => import('@/pages/instructor/CourseProposals'));
const InstructorQuizzes = lazy(() => import('@/pages/instructor/Quizzes'));
const InstructorPayouts = lazy(() => import('@/pages/instructor/Payouts'));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminCourses = lazy(() => import('@/pages/admin/Courses'));
const AdminApplications = lazy(() => import('@/pages/admin/Applications'));
const AdminPayments = lazy(() => import('@/pages/admin/Payments'));
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'));
const AdminCourseProposals = lazy(() => import('@/pages/admin/CourseProposals'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminExams = lazy(() => import('@/pages/admin/Exams'));
const AdminCertificates = lazy(() => import('@/pages/admin/Certificates'));
const AdminCertificateTemplates = lazy(() => import('@/pages/admin/CertificateTemplates'));
const AdminTickets = lazy(() => import('@/pages/admin/Tickets'));
const AdminBroadcasts = lazy(() => import('@/pages/admin/Broadcasts'));
const AdminAuditLog = lazy(() => import('@/pages/admin/AuditLog'));
const AdminCategories = lazy(() => import('@/pages/admin/Categories'));
const AdminExamMonitor = lazy(() => import('@/pages/admin/ExamMonitor'));
const AdminReports = lazy(() => import('@/pages/admin/Reports'));
const AdminMessages = lazy(() => import('@/pages/admin/Messages'));
const AdminPayouts = lazy(() => import('@/pages/admin/Payouts'));
const AdminManagement = lazy(() => import('@/pages/admin/AdminManagement'));

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) return <>{children}</>;

  const role = user?.role || 'student';
  const dashboardPath =
    role === 'admin' || role === 'super_admin'
      ? '/admin/dashboard'
      : role === 'instructor'
        ? '/instructor/dashboard'
        : '/student/dashboard';

  return <Navigate to={dashboardPath} replace />;
}

function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const wakeUp = async () => {
      try {
        await fetch('/health', { signal: AbortSignal.timeout(15000) });
      } catch {
        // Server may still be cold-booting — that's OK
      }
      setBackendReady(true);
    };
    wakeUp();
  }, []);

  if (!initialized || !backendReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader text="Loading..." />
      </div>
    );
  }

  return (
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<GuestRoute><SuspenseWrapper><Home /></SuspenseWrapper></GuestRoute>} />
          <Route path="/about" element={<SuspenseWrapper><About /></SuspenseWrapper>} />
          <Route path="/courses" element={<SuspenseWrapper><Courses /></SuspenseWrapper>} />
          <Route path="/courses/:slug" element={<SuspenseWrapper><CourseDetails /></SuspenseWrapper>} />
          <Route path="/blog" element={<SuspenseWrapper><Blog /></SuspenseWrapper>} />
          <Route path="/blog/:slug" element={<SuspenseWrapper><BlogPost /></SuspenseWrapper>} />
          <Route path="/contact" element={<SuspenseWrapper><Contact /></SuspenseWrapper>} />
          <Route path="/pricing" element={<SuspenseWrapper><Pricing /></SuspenseWrapper>} />
          <Route path="/community" element={<SuspenseWrapper><Community /></SuspenseWrapper>} />
          <Route path="/login" element={<SuspenseWrapper><Login /></SuspenseWrapper>} />
          <Route path="/signup" element={<SuspenseWrapper><Signup /></SuspenseWrapper>} />
          <Route path="/forgot-password" element={<SuspenseWrapper><ForgotPassword /></SuspenseWrapper>} />
          <Route path="/reset-password/:token" element={<SuspenseWrapper><ResetPassword /></SuspenseWrapper>} />
          <Route path="/verify-email/:token" element={<SuspenseWrapper><VerifyEmail /></SuspenseWrapper>} />
          <Route path="/auth/verify-pending" element={<SuspenseWrapper><VerifyPending /></SuspenseWrapper>} />
          <Route path="/auth/verified" element={<SuspenseWrapper><Verified /></SuspenseWrapper>} />
          <Route path="/auth/verification-error" element={<SuspenseWrapper><VerificationError /></SuspenseWrapper>} />
          <Route path="/become-instructor" element={<SuspenseWrapper><BecomeInstructor /></SuspenseWrapper>} />
          <Route path="/apply" element={<SuspenseWrapper><Apply /></SuspenseWrapper>} />
          <Route path="/verify-payment" element={<SuspenseWrapper><VerifyPayment /></SuspenseWrapper>} />
          <Route path="/verify-certificate" element={<SuspenseWrapper><VerifyCertificate /></SuspenseWrapper>} />
          <Route path="/checkout" element={<SuspenseWrapper><Checkout /></SuspenseWrapper>} />
          <Route path="/faq" element={<SuspenseWrapper><FAQ /></SuspenseWrapper>} />
          <Route path="/careers" element={<SuspenseWrapper><Careers /></SuspenseWrapper>} />
          <Route path="/partners" element={<SuspenseWrapper><Partners /></SuspenseWrapper>} />
          <Route path="/press" element={<SuspenseWrapper><Press /></SuspenseWrapper>} />
          <Route path="/help" element={<SuspenseWrapper><Help /></SuspenseWrapper>} />
          <Route path="/guide" element={<SuspenseWrapper><UserGuide /></SuspenseWrapper>} />
          <Route path="/terms" element={<SuspenseWrapper><Terms /></SuspenseWrapper>} />
          <Route path="/privacy" element={<SuspenseWrapper><Privacy /></SuspenseWrapper>} />
          <Route path="/cookies" element={<SuspenseWrapper><Cookies /></SuspenseWrapper>} />
          <Route path="/accessibility" element={<SuspenseWrapper><Accessibility /></SuspenseWrapper>} />
        </Route>

        <Route path="/student" element={<DashboardLayout requiredRole="student" />}>
          <Route path="dashboard" element={<SuspenseWrapper><StudentDashboard /></SuspenseWrapper>} />
          <Route path="courses" element={<SuspenseWrapper><StudentMyCourses /></SuspenseWrapper>} />
          <Route path="courses/:slug" element={<SuspenseWrapper><StudentCourseView /></SuspenseWrapper>} />
          <Route path="learning-paths" element={<SuspenseWrapper><StudentLearningPaths /></SuspenseWrapper>} />
          <Route path="learning-paths/:slug" element={<SuspenseWrapper><StudentLearningPathDetail /></SuspenseWrapper>} />
          <Route path="assignments" element={<SuspenseWrapper><StudentAssignments /></SuspenseWrapper>} />
          <Route path="certificates" element={<SuspenseWrapper><StudentCertificate /></SuspenseWrapper>} />
          <Route path="leaderboard" element={<SuspenseWrapper><StudentLeaderboard /></SuspenseWrapper>} />
          <Route path="calendar" element={<SuspenseWrapper><StudentCalendar /></SuspenseWrapper>} />
          <Route path="notifications" element={<SuspenseWrapper><StudentNotifications /></SuspenseWrapper>} />
          <Route path="tickets" element={<SuspenseWrapper><StudentTickets /></SuspenseWrapper>} />
          <Route path="messages" element={<SuspenseWrapper><StudentMessages /></SuspenseWrapper>} />
          <Route path="quiz/:quizId" element={<SuspenseWrapper><StudentQuizTake /></SuspenseWrapper>} />
          <Route path="exams" element={<SuspenseWrapper><StudentExamsList /></SuspenseWrapper>} />
          <Route path="exams/:examId" element={<SuspenseWrapper><StudentExamTake /></SuspenseWrapper>} />
          <Route path="exams/:examId/results/:attemptId" element={<SuspenseWrapper><StudentExamResults /></SuspenseWrapper>} />
          <Route path="challenges" element={<SuspenseWrapper><StudentChallenges /></SuspenseWrapper>} />
          <Route path="profile" element={<SuspenseWrapper><StudentProfile /></SuspenseWrapper>} />
          <Route path="settings" element={<SuspenseWrapper><StudentSettings /></SuspenseWrapper>} />
        </Route>

        <Route path="/instructor" element={<DashboardLayout requiredRole="instructor" />}>
          <Route path="dashboard" element={<SuspenseWrapper><InstructorDashboard /></SuspenseWrapper>} />
          <Route path="analytics" element={<SuspenseWrapper><InstructorAnalytics /></SuspenseWrapper>} />
          <Route path="courses" element={<SuspenseWrapper><InstructorManageCourses /></SuspenseWrapper>} />
          <Route path="course-proposals" element={<SuspenseWrapper><InstructorCourseProposals /></SuspenseWrapper>} />
          <Route path="courses/new" element={<SuspenseWrapper><InstructorCourseEditor /></SuspenseWrapper>} />
          <Route path="courses/:slug/edit" element={<SuspenseWrapper><InstructorCourseEditor /></SuspenseWrapper>} />
          <Route path="students" element={<SuspenseWrapper><InstructorStudents /></SuspenseWrapper>} />
          <Route path="assignments" element={<SuspenseWrapper><InstructorAssignments /></SuspenseWrapper>} />
          <Route path="submissions" element={<SuspenseWrapper><InstructorSubmissions /></SuspenseWrapper>} />
          <Route path="announcements" element={<SuspenseWrapper><InstructorAnnouncements /></SuspenseWrapper>} />
          <Route path="live-classes" element={<SuspenseWrapper><InstructorLiveClasses /></SuspenseWrapper>} />
          <Route path="messages" element={<SuspenseWrapper><InstructorMessages /></SuspenseWrapper>} />
          <Route path="schedule" element={<SuspenseWrapper><InstructorSchedule /></SuspenseWrapper>} />
          <Route path="quizzes" element={<SuspenseWrapper><InstructorQuizzes /></SuspenseWrapper>} />
          <Route path="payouts" element={<SuspenseWrapper><InstructorPayouts /></SuspenseWrapper>} />
          <Route path="exams" element={<SuspenseWrapper><AdminExams /></SuspenseWrapper>} />
          <Route path="exams/:examId" element={<SuspenseWrapper><AdminExams /></SuspenseWrapper>} />
          <Route path="exams/monitor" element={<SuspenseWrapper><AdminExamMonitor /></SuspenseWrapper>} />
          <Route path="profile" element={<SuspenseWrapper><StudentProfile /></SuspenseWrapper>} />
        </Route>

        <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
          <Route path="dashboard" element={<SuspenseWrapper><AdminDashboard /></SuspenseWrapper>} />
          <Route path="users" element={<SuspenseWrapper><AdminUsers /></SuspenseWrapper>} />
          <Route path="courses" element={<SuspenseWrapper><AdminCourses /></SuspenseWrapper>} />
          <Route path="course-proposals" element={<SuspenseWrapper><AdminCourseProposals /></SuspenseWrapper>} />
          <Route path="applications" element={<SuspenseWrapper><AdminApplications /></SuspenseWrapper>} />
          <Route path="payments" element={<SuspenseWrapper><AdminPayments /></SuspenseWrapper>} />
          <Route path="payouts" element={<SuspenseWrapper><AdminPayouts /></SuspenseWrapper>} />
          <Route path="exams" element={<SuspenseWrapper><AdminExams /></SuspenseWrapper>} />
          <Route path="exams/monitor" element={<SuspenseWrapper><AdminExamMonitor /></SuspenseWrapper>} />
            <Route path="certificates" element={<SuspenseWrapper><AdminCertificates /></SuspenseWrapper>} />
            <Route path="certificate-templates" element={<SuspenseWrapper><AdminCertificateTemplates /></SuspenseWrapper>} />
          <Route path="tickets" element={<SuspenseWrapper><AdminTickets /></SuspenseWrapper>} />
          <Route path="broadcasts" element={<SuspenseWrapper><AdminBroadcasts /></SuspenseWrapper>} />
          <Route path="categories" element={<SuspenseWrapper><AdminCategories /></SuspenseWrapper>} />
          <Route path="reports" element={<SuspenseWrapper><AdminReports /></SuspenseWrapper>} />
          <Route path="messages" element={<SuspenseWrapper><AdminMessages /></SuspenseWrapper>} />
          <Route path="audit-log" element={<SuspenseWrapper><AdminAuditLog /></SuspenseWrapper>} />
          <Route path="admin-management" element={<SuspenseWrapper><AdminManagement /></SuspenseWrapper>} />
          <Route path="analytics" element={<SuspenseWrapper><AdminAnalytics /></SuspenseWrapper>} />
          <Route path="settings" element={<SuspenseWrapper><AdminSettings /></SuspenseWrapper>} />
        </Route>

        <Route path="*" element={<SuspenseWrapper><NotFound /></SuspenseWrapper>} />
      </Routes>
  );
}

export default App;
