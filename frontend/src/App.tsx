import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader, PageLoader } from '@/components/ui/Loader';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { OnboardingProvider } from '@/guides/OnboardingContext';
import { OnboardingModal } from '@/guides/OnboardingModal';
import { AnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { ScrollToTop, ErrorBoundary } from '@/components/ui';
import { SkeletonLine, SkeletonBlock } from '@/components/ui/Skeleton';

function PageSkeleton() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-6 animate-fade-in">
        <SkeletonLine width="w-64" className="h-10 rounded-xl" />
        <SkeletonLine width="w-96" className="h-5 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
        <SkeletonBlock className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
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
const CommunityDetail = lazy(() => import('@/pages/CommunityDetail'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const SetPassword = lazy(() => import('@/pages/SetPassword'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));
const VerifyPending = lazy(() => import('@/pages/VerifyPending'));
const Verified = lazy(() => import('@/pages/Verified'));
const VerificationError = lazy(() => import('@/pages/VerificationError'));
const SocialCallback = lazy(() => import('@/pages/SocialCallback'));
const BecomeInstructor = lazy(() => import('@/pages/BecomeInstructor'));
const Apply = lazy(() => import('@/pages/Apply'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const VerifyPayment = lazy(() => import('@/pages/VerifyPayment'));
const VerifyCertificate = lazy(() => import('@/pages/public/VerifyCertificate'));
const Schools = lazy(() => import('@/pages/public/Schools'));
const SchoolDetail = lazy(() => import('@/pages/public/SchoolDetail'));
const ProgramDetail = lazy(() => import('@/pages/public/ProgramDetail'));
const CareerCenter = lazy(() => import('@/pages/public/CareerCenter'));
const JobBoard = lazy(() => import('@/pages/public/JobBoard'));
const InternshipsPage = lazy(() => import('@/pages/public/InternshipsPage'));
const AlumniDirectory = lazy(() => import('@/pages/public/AlumniDirectory'));
const PublicProfile = lazy(() => import('@/pages/public/PublicProfile'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Careers = lazy(() => import('@/pages/Careers'));
const Partners = lazy(() => import('@/pages/Partners'));
const Press = lazy(() => import('@/pages/Press'));
const Help = lazy(() => import('@/pages/Help'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Cookies = lazy(() => import('@/pages/Cookies'));
const Accessibility = lazy(() => import('@/pages/Accessibility'));
const Board = lazy(() => import('@/pages/public/Board'));
// Student pages
const StudentDashboard = lazy(() => import('@/pages/student/Dashboard'));
const StudentMyCourses = lazy(() => import('@/pages/student/MyCourses'));
const StudentCourseView = lazy(() => import('@/pages/student/CourseView'));
const StudentAssignments = lazy(() => import('@/pages/student/Assignments'));
const StudentCertificate = lazy(() => import('@/pages/student/Certificate'));
const StudentProfile = lazy(() => import('@/pages/student/Profile'));
const StudentLearningPaths = lazy(() => import('@/pages/student/LearningPaths'));
const StudentLearningPathDetail = lazy(() => import('@/pages/student/LearningPathDetail'));
const StudentCareerGoalDetail = lazy(() => import('@/pages/student/CareerGoalDetail'));
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
const StudentRoadmap = lazy(() => import('@/pages/student/Roadmap'));
const StudentStudyPlans = lazy(() => import('@/pages/student/StudyPlans'));
const StudentMentorship = lazy(() => import('@/pages/student/Mentorship'));
const StudentSkillTree = lazy(() => import('@/pages/student/SkillTree'));
const StudentApplications = lazy(() => import('@/pages/student/Applications'));
const StudentPortfolio = lazy(() => import('@/pages/student/Portfolio'));
const StudentGuidedMode = lazy(() => import('@/pages/student/GuidedMode'));
const StudentPathwayFinder = lazy(() => import('@/pages/student/PathwayFinder'));

// Instructor pages
const InstructorDashboard = lazy(() => import('@/pages/instructor/Dashboard'));
const InstructorCommunities = lazy(() => import('@/pages/instructor/Communities'));
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
const InstructorProfile = lazy(() => import('@/pages/instructor/Profile'));
const InstructorMentorship = lazy(() => import('@/pages/instructor/Mentorship'));
const InstructorPrograms = lazy(() => import('@/pages/instructor/Programs'));
const InstructorDiscussions = lazy(() => import('@/pages/instructor/Discussions'));
const InstructorReviews = lazy(() => import('@/pages/instructor/Reviews'));
const InstructorCertificates = lazy(() => import('@/pages/instructor/Certificates'));
const InstructorResources = lazy(() => import('@/pages/instructor/Resources'));
const InstructorNotifications = lazy(() => import('@/pages/instructor/Notifications'));
const InstructorEarnings = lazy(() => import('@/pages/instructor/Earnings'));
const InstructorCourseBuilder = lazy(() => import('@/pages/instructor/CourseBuilder'));

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
const AdminCalendar = lazy(() => import('@/pages/admin/CalendarManagement'));
const AdminCommunityManagement = lazy(() => import('@/pages/admin/CommunityManagement'));
const AdminCourseDetail = lazy(() => import('@/pages/admin/AdminCourseDetail'));
const AdminCareer = lazy(() => import('@/pages/admin/CareerManagement'));
const AdminPromotions = lazy(() => import('@/pages/admin/Promotions'));
const AdminBoardOversight = lazy(() => import('@/pages/admin/BoardOversight'));
const AdminPrograms = lazy(() => import('@/pages/admin/Programs'));

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
    // Skip initialize on OAuth callback — let SocialCallback handle it via cookie
    if (window.location.pathname === '/auth/callback') {
      setBackendReady(true);
      // still mark initialized to avoid loader, SocialCallback will fetch user
      useAuthStore.setState({ initialized: true });
      return;
    }
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
        <Loader />
      </div>
    );
  }

  return (
    <OnboardingProvider>
      <AnalyticsTracker />
      <ScrollToTop />
      <Routes>
        <Route element={<ErrorBoundary><MainLayout /></ErrorBoundary>}>
          <Route path="/" element={<GuestRoute><SuspenseWrapper><Home /></SuspenseWrapper></GuestRoute>} />
          <Route path="/about" element={<SuspenseWrapper><About /></SuspenseWrapper>} />
          <Route path="/schools" element={<SuspenseWrapper><Schools /></SuspenseWrapper>} />
          <Route path="/schools/:slug" element={<SuspenseWrapper><SchoolDetail /></SuspenseWrapper>} />
          <Route path="/schools/programs/:slug" element={<SuspenseWrapper><ProgramDetail /></SuspenseWrapper>} />
          <Route path="/courses" element={<SuspenseWrapper><Courses /></SuspenseWrapper>} />
          <Route path="/courses/:slug" element={<SuspenseWrapper><CourseDetails /></SuspenseWrapper>} />
          <Route path="/learning-paths/:slug" element={<SuspenseWrapper><StudentLearningPathDetail variant="public" /></SuspenseWrapper>} />
          <Route path="/blog" element={<SuspenseWrapper><Blog /></SuspenseWrapper>} />
          <Route path="/blog/:slug" element={<SuspenseWrapper><BlogPost /></SuspenseWrapper>} />
          <Route path="/contact" element={<SuspenseWrapper><Contact /></SuspenseWrapper>} />
          <Route path="/pricing" element={<SuspenseWrapper><Pricing /></SuspenseWrapper>} />
          <Route path="/community" element={<SuspenseWrapper><Community /></SuspenseWrapper>} />
          <Route path="/community/:id" element={<SuspenseWrapper><Community /></SuspenseWrapper>} />
          <Route path="/login" element={<SuspenseWrapper><Login /></SuspenseWrapper>} />
          <Route path="/signup" element={<SuspenseWrapper><Signup /></SuspenseWrapper>} />
          <Route path="/forgot-password" element={<SuspenseWrapper><ForgotPassword /></SuspenseWrapper>} />
          <Route path="/reset-password/:token" element={<SuspenseWrapper><ResetPassword /></SuspenseWrapper>} />
          <Route path="/auth/set-password/:token" element={<SuspenseWrapper><SetPassword /></SuspenseWrapper>} />
          <Route path="/verify-email/:token" element={<SuspenseWrapper><VerifyEmail /></SuspenseWrapper>} />
          <Route path="/auth/verify-pending" element={<SuspenseWrapper><VerifyPending /></SuspenseWrapper>} />
          <Route path="/auth/verified" element={<SuspenseWrapper><Verified /></SuspenseWrapper>} />
          <Route path="/auth/verification-error" element={<SuspenseWrapper><VerificationError /></SuspenseWrapper>} />
          <Route path="/auth/callback" element={<SuspenseWrapper><SocialCallback /></SuspenseWrapper>} />
          <Route path="/become-instructor" element={<SuspenseWrapper><BecomeInstructor /></SuspenseWrapper>} />
          <Route path="/apply" element={<SuspenseWrapper><Apply /></SuspenseWrapper>} />
          <Route path="/verify-payment" element={<SuspenseWrapper><VerifyPayment /></SuspenseWrapper>} />
          <Route path="/verify-certificate" element={<SuspenseWrapper><VerifyCertificate /></SuspenseWrapper>} />
          <Route path="/checkout" element={<SuspenseWrapper><Checkout /></SuspenseWrapper>} />
          <Route path="/career" element={<SuspenseWrapper><CareerCenter /></SuspenseWrapper>} />
          <Route path="/career/jobs" element={<SuspenseWrapper><JobBoard /></SuspenseWrapper>} />
          <Route path="/career/internships" element={<SuspenseWrapper><InternshipsPage /></SuspenseWrapper>} />
          <Route path="/career/alumni" element={<SuspenseWrapper><AlumniDirectory /></SuspenseWrapper>} />
          <Route path="/u/:username" element={<SuspenseWrapper><PublicProfile /></SuspenseWrapper>} />
          <Route path="/faq" element={<SuspenseWrapper><FAQ /></SuspenseWrapper>} />
          <Route path="/careers" element={<SuspenseWrapper><Careers /></SuspenseWrapper>} />
          <Route path="/partners" element={<SuspenseWrapper><Partners /></SuspenseWrapper>} />
          <Route path="/press" element={<SuspenseWrapper><Press /></SuspenseWrapper>} />
          <Route path="/help" element={<SuspenseWrapper><Help /></SuspenseWrapper>} />
          <Route path="/terms" element={<SuspenseWrapper><Terms /></SuspenseWrapper>} />
          <Route path="/privacy" element={<SuspenseWrapper><Privacy /></SuspenseWrapper>} />
          <Route path="/cookies" element={<SuspenseWrapper><Cookies /></SuspenseWrapper>} />
          <Route path="/accessibility" element={<SuspenseWrapper><Accessibility /></SuspenseWrapper>} />
          <Route path="/board" element={<SuspenseWrapper><Board /></SuspenseWrapper>} />
        </Route>

        <Route path="/student" element={<DashboardLayout requiredRole="student" />}>
          <Route path="dashboard" element={<SuspenseWrapper><StudentDashboard /></SuspenseWrapper>} />
          <Route path="courses" element={<SuspenseWrapper><StudentMyCourses /></SuspenseWrapper>} />
          <Route path="courses/:slug" element={<SuspenseWrapper><StudentCourseView /></SuspenseWrapper>} />
          <Route path="learning-paths" element={<SuspenseWrapper><StudentLearningPaths /></SuspenseWrapper>} />
          <Route path="learning-paths/:slug" element={<SuspenseWrapper><StudentLearningPathDetail /></SuspenseWrapper>} />
          <Route path="career-goals/:slug" element={<SuspenseWrapper><StudentCareerGoalDetail /></SuspenseWrapper>} />
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
          <Route path="roadmap" element={<SuspenseWrapper><StudentRoadmap /></SuspenseWrapper>} />
          <Route path="study-plans" element={<SuspenseWrapper><StudentStudyPlans /></SuspenseWrapper>} />
          <Route path="profile" element={<SuspenseWrapper><StudentProfile /></SuspenseWrapper>} />
          <Route path="settings" element={<SuspenseWrapper><StudentSettings /></SuspenseWrapper>} />
          <Route path="mentoring" element={<SuspenseWrapper><StudentMentorship /></SuspenseWrapper>} />
          <Route path="skill-tree/:courseId" element={<SuspenseWrapper><StudentSkillTree /></SuspenseWrapper>} />
          <Route path="applications" element={<SuspenseWrapper><StudentApplications /></SuspenseWrapper>} />
          <Route path="portfolio" element={<SuspenseWrapper><StudentPortfolio /></SuspenseWrapper>} />
          <Route path="guided" element={<SuspenseWrapper><StudentGuidedMode /></SuspenseWrapper>} />
          <Route path="guided/:slug" element={<SuspenseWrapper><StudentGuidedMode /></SuspenseWrapper>} />
          <Route path="pathway-finder" element={<SuspenseWrapper><StudentPathwayFinder /></SuspenseWrapper>} />
        </Route>

        <Route path="/instructor" element={<DashboardLayout requiredRole="instructor" />}>
          <Route path="dashboard" element={<SuspenseWrapper><InstructorDashboard /></SuspenseWrapper>} />
          <Route path="analytics" element={<SuspenseWrapper><InstructorAnalytics /></SuspenseWrapper>} />
          <Route path="courses" element={<SuspenseWrapper><InstructorManageCourses /></SuspenseWrapper>} />
          <Route path="course-proposals" element={<SuspenseWrapper><InstructorCourseProposals /></SuspenseWrapper>} />
          <Route path="courses/new" element={<SuspenseWrapper><InstructorCourseBuilder /></SuspenseWrapper>} />
          <Route path="courses/:slug/edit" element={<SuspenseWrapper><InstructorCourseEditor /></SuspenseWrapper>} />
          <Route path="students" element={<SuspenseWrapper><InstructorStudents /></SuspenseWrapper>} />
          <Route path="assignments" element={<SuspenseWrapper><InstructorAssignments /></SuspenseWrapper>} />
          <Route path="submissions" element={<SuspenseWrapper><InstructorSubmissions /></SuspenseWrapper>} />
          <Route path="announcements" element={<SuspenseWrapper><InstructorAnnouncements /></SuspenseWrapper>} />
          <Route path="live-classes" element={<SuspenseWrapper><InstructorLiveClasses /></SuspenseWrapper>} />
          <Route path="messages" element={<SuspenseWrapper><InstructorMessages /></SuspenseWrapper>} />
          <Route path="schedule" element={<SuspenseWrapper><InstructorSchedule /></SuspenseWrapper>} />
          <Route path="quizzes" element={<SuspenseWrapper><InstructorQuizzes /></SuspenseWrapper>} />
          <Route path="earnings" element={<SuspenseWrapper><InstructorEarnings /></SuspenseWrapper>} />
          <Route path="payouts" element={<SuspenseWrapper><InstructorPayouts /></SuspenseWrapper>} />
          <Route path="exams" element={<SuspenseWrapper><AdminExams /></SuspenseWrapper>} />
          <Route path="exams/:examId" element={<SuspenseWrapper><AdminExams /></SuspenseWrapper>} />
          <Route path="exams/monitor" element={<SuspenseWrapper><AdminExamMonitor /></SuspenseWrapper>} />
          <Route path="profile" element={<SuspenseWrapper><InstructorProfile /></SuspenseWrapper>} />
          <Route path="mentoring" element={<SuspenseWrapper><InstructorMentorship /></SuspenseWrapper>} />
          <Route path="programs" element={<SuspenseWrapper><InstructorPrograms /></SuspenseWrapper>} />
          <Route path="discussions" element={<SuspenseWrapper><InstructorDiscussions /></SuspenseWrapper>} />
          <Route path="communities" element={<SuspenseWrapper><InstructorCommunities /></SuspenseWrapper>} />
          <Route path="reviews" element={<SuspenseWrapper><InstructorReviews /></SuspenseWrapper>} />
          <Route path="certificates" element={<SuspenseWrapper><InstructorCertificates /></SuspenseWrapper>} />
          <Route path="resources" element={<SuspenseWrapper><InstructorResources /></SuspenseWrapper>} />
          <Route path="notifications" element={<SuspenseWrapper><InstructorNotifications /></SuspenseWrapper>} />
        </Route>

        <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
          <Route path="dashboard" element={<SuspenseWrapper><AdminDashboard /></SuspenseWrapper>} />
          <Route path="users" element={<SuspenseWrapper><AdminUsers /></SuspenseWrapper>} />
          <Route path="courses" element={<SuspenseWrapper><AdminCourses /></SuspenseWrapper>} />
          <Route path="courses/:id" element={<SuspenseWrapper><AdminCourseDetail /></SuspenseWrapper>} />
          <Route path="course-proposals" element={<SuspenseWrapper><AdminCourseProposals /></SuspenseWrapper>} />
          <Route path="programs" element={<SuspenseWrapper><AdminPrograms /></SuspenseWrapper>} />
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
          <Route path="community-management" element={<SuspenseWrapper><AdminCommunityManagement /></SuspenseWrapper>} />
          <Route path="analytics" element={<SuspenseWrapper><AdminAnalytics /></SuspenseWrapper>} />
          <Route path="calendar" element={<SuspenseWrapper><AdminCalendar /></SuspenseWrapper>} />
          <Route path="career" element={<SuspenseWrapper><AdminCareer /></SuspenseWrapper>} />
          <Route path="promotions" element={<SuspenseWrapper><AdminPromotions /></SuspenseWrapper>} />
          <Route path="board-oversight" element={<SuspenseWrapper><AdminBoardOversight /></SuspenseWrapper>} />
          <Route path="settings" element={<SuspenseWrapper><AdminSettings /></SuspenseWrapper>} />
        </Route>

        <Route path="*" element={<SuspenseWrapper><NotFound /></SuspenseWrapper>} />
      </Routes>
      <OnboardingModal />
    </OnboardingProvider>
  );
}

export default App;
