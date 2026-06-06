import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useThemeStore } from '@/store/themeStore';

import Home from '@/pages/Home';
import About from '@/pages/About';
import Courses from '@/pages/Courses';
import CourseDetails from '@/pages/CourseDetails';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';
import Contact from '@/pages/Contact';
import Pricing from '@/pages/Pricing';
import Community from '@/pages/Community';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import BecomeInstructor from '@/pages/BecomeInstructor';
import Apply from '@/pages/Apply';
import NotFound from '@/pages/NotFound';
import VerifyPayment from '@/pages/VerifyPayment';

import StudentDashboard from '@/pages/student/Dashboard';
import StudentMyCourses from '@/pages/student/MyCourses';
import StudentCourseView from '@/pages/student/CourseView';
import StudentAssignments from '@/pages/student/Assignments';
import StudentCertificate from '@/pages/student/Certificate';
import StudentProfile from '@/pages/student/Profile';

import InstructorDashboard from '@/pages/instructor/Dashboard';
import InstructorManageCourses from '@/pages/instructor/ManageCourses';
import InstructorCourseEditor from '@/pages/instructor/CourseEditor';
import InstructorAssignments from '@/pages/instructor/Assignments';
import InstructorStudents from '@/pages/instructor/Students';
import InstructorAnalytics from '@/pages/instructor/Analytics';
import InstructorSubmissions from '@/pages/instructor/Submissions';
import InstructorAnnouncements from '@/pages/instructor/Announcements';
import InstructorLiveClasses from '@/pages/instructor/LiveClasses';
import InstructorMessages from '@/pages/instructor/Messages';
import InstructorSchedule from '@/pages/instructor/Schedule';
import InstructorCourseProposals from '@/pages/instructor/CourseProposals';

import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';
import AdminCourses from '@/pages/admin/Courses';
import AdminApplications from '@/pages/admin/Applications';
import AdminPayments from '@/pages/admin/Payments';
import AdminAnalytics from '@/pages/admin/Analytics';
import AdminCourseProposals from '@/pages/admin/CourseProposals';
import AdminSettings from '@/pages/admin/Settings';

function App() {
  const { darkMode } = useThemeStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetails />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/community" element={<Community />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/become-instructor" element={<BecomeInstructor />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/verify-payment" element={<VerifyPayment />} />
        </Route>

        <Route path="/student" element={<DashboardLayout requiredRole="student" />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="courses" element={<StudentMyCourses />} />
          <Route path="courses/:slug" element={<StudentCourseView />} />
          <Route path="assignments" element={<StudentAssignments />} />
          <Route path="certificates" element={<StudentCertificate />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        <Route path="/instructor" element={<DashboardLayout requiredRole="instructor" />}>
          <Route path="dashboard" element={<InstructorDashboard />} />
          <Route path="analytics" element={<InstructorAnalytics />} />
          <Route path="courses" element={<InstructorManageCourses />} />
          <Route path="course-proposals" element={<InstructorCourseProposals />} />
          <Route path="courses/new" element={<InstructorCourseEditor />} />
          <Route path="courses/:slug/edit" element={<InstructorCourseEditor />} />
          <Route path="students" element={<InstructorStudents />} />
          <Route path="assignments" element={<InstructorAssignments />} />
          <Route path="submissions" element={<InstructorSubmissions />} />
          <Route path="announcements" element={<InstructorAnnouncements />} />
          <Route path="live-classes" element={<InstructorLiveClasses />} />
          <Route path="messages" element={<InstructorMessages />} />
          <Route path="schedule" element={<InstructorSchedule />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="course-proposals" element={<AdminCourseProposals />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
