import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, GraduationCap, Presentation, Shield, Monitor, CheckCircle,
  Mail, Settings, Bell, Calendar, MessageCircle, Users, Award, BarChart,
  CreditCard, Clock, Target, FileText, Play, HelpCircle, UserCheck, BookMarked,
  Zap, Layers, Star, DollarSign, Megaphone, PieChart, Activity, ShieldCheck,
  Sliders, Eye, MessageSquare, FileCheck, ClipboardList, Briefcase, ScrollText,
  ArrowRight, Terminal
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Tab = 'getting-started' | 'student' | 'instructor' | 'admin';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { id: 'student', label: 'Student Guide', icon: GraduationCap },
  { id: 'instructor', label: 'Instructor Guide', icon: Presentation },
  { id: 'admin', label: 'Admin Guide', icon: Shield },
];

function Screenshot({ description }: { description: string }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-700">
      <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-400 font-medium text-sm">Screenshot: {description}</p>
    </div>
  );
}

function SectionCard({ title, children, icon: Icon, delay = 0 }: { title: string; children: React.ReactNode; icon: React.ElementType; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      <GlassCard className="p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary-500" />
          </div>
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
          {children}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function Guide() {
  const [activeTab, setActiveTab] = useState<Tab>('getting-started');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              User <span className="gradient-text">Guide</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              Everything you need to know about using CareerCode Academy after creating your account.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Select a role below to jump to the relevant section.
            </p>
          </motion.div>

          <div className="flex flex-wrap gap-3 mb-12 justify-center sticky top-20 z-10 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'glass hover:bg-white/80 dark:hover:bg-gray-800/80'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'getting-started' && (
            <div className="space-y-6">
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-2xl mx-auto">
                Welcome to CareerCode Academy! This section walks you through the first steps after signing up.
              </p>

              <SectionCard title="1. Email Verification" icon={Mail}>
                <p>After registration, you will receive a 6-digit verification code by email.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Check your inbox (and spam folder) for the verification email.</li>
                  <li>Enter the 6-digit code on the verification page.</li>
                  <li>You can also click the verification link sent to your email.</li>
                  <li>If you do not see the email, click <strong>Resend Code</strong> on the verification page.</li>
                </ul>
                <Screenshot description="Email verification page with code input" />
                <p>Once verified, you gain full access to all platform features.</p>
              </SectionCard>

              <SectionCard title="2. Completing Your Profile" icon={UserCheck}>
                <p>Your profile helps instructors and peers know who you are.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Profile</strong> from the sidebar after logging in.</li>
                  <li>Add a profile photo (supports JPG, PNG).</li>
                  <li>Write a short bio about yourself.</li>
                  <li>Update your name and contact details.</li>
                </ul>
                <Screenshot description="Profile editing page" />
              </SectionCard>

              <SectionCard title="3. Understanding the Dashboard" icon={Layers}>
                <p>Your dashboard is the central hub for everything on the platform.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Progress Overview</strong> — see completed lessons, overall course progress.</li>
                  <li><strong>XP & Level</strong> — earn experience points by completing activities.</li>
                  <li><strong>Streak</strong> — maintain daily activity to build your streak.</li>
                  <li><strong>Recent Courses</strong> — quick access to courses you are enrolled in.</li>
                  <li><strong>Upcoming Deadlines</strong> — assignments and exams due soon.</li>
                  <li><strong>Recommended Courses</strong> — personalized suggestions based on your interests.</li>
                </ul>
                <Screenshot description="Student dashboard overview" />
              </SectionCard>

              <SectionCard title="4. Platform Navigation" icon={Target}>
                <p>The platform is organized into three main areas:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Top Navbar</strong> — browse courses, blog, community, and help resources.</li>
                  <li><strong>Sidebar</strong> — access all your tools: courses, assignments, messages, and more.</li>
                  <li><strong>Mobile Bottom Nav</strong> — quick navigation to key pages on your phone.</li>
                </ul>
                <p>Use the sidebar collapse button to expand or minimize the sidebar for more screen space.</p>
              </SectionCard>

              <SectionCard title="5. Account Settings" icon={Settings}>
                <p>Manage your account preferences at any time.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Password</strong> — change your login password.</li>
                  <li><strong>Notifications</strong> — control which alerts you receive (email vs in-app).</li>
                  <li><strong>Privacy</strong> — manage profile visibility.</li>
                  <li><strong>Theme</strong> — toggle between light and dark mode.</li>
                </ul>
                <Screenshot description="Account settings page" />
              </SectionCard>
            </div>
          )}

          {activeTab === 'student' && (
            <div className="space-y-6">
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-2xl mx-auto">
                Learn how to make the most of your learning experience as a student.
              </p>

              <SectionCard title="Student Dashboard" icon={Layers}>
                <p>Your dashboard is your command center. Key metrics include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>XP Points & Level</strong> — gain XP by completing lessons, quizzes, and assignments.</li>
                  <li><strong>Daily Streak</strong> — log in and learn every day to build your streak.</li>
                  <li><strong>Course Progress</strong> — percentage complete for each enrolled course.</li>
                  <li><strong>Rank</strong> — see your position on the leaderboard.</li>
                  <li><strong>Badges & Achievements</strong> — earn badges for milestones.</li>
                  <li><strong>Weekly/Monthly Charts</strong> — visualize your learning activity over time.</li>
                </ul>
                <Screenshot description="Student dashboard with XP, streak, progress" />
              </SectionCard>

              <SectionCard title="Browsing & Enrolling in Courses" icon={BookMarked}>
                <p>Find and enroll in courses that match your goals.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Courses</strong> from the navbar to browse all available courses.</li>
                  <li>Filter by category, difficulty level, or search by keyword.</li>
                  <li>Click a course to view details: syllabus, instructor, reviews, and pricing.</li>
                  <li>Click <strong>Enroll Now</strong> or <strong>Add to Cart</strong> to purchase.</li>
                  <li>Free courses can be enrolled in immediately at no cost.</li>
                </ul>
                <Screenshot description="Course catalog page with filters" />
              </SectionCard>

              <SectionCard title="Watching Lessons" icon={Play}>
                <p>Course content is organized into modules with video lessons.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Navigate through modules using the course sidebar.</li>
                  <li>Video playback automatically saves your position.</li>
                  <li>Bookmark important moments for quick review.</li>
                  <li>Download lesson resources and reference materials.</li>
                  <li>Participate in lesson discussions to ask questions.</li>
                </ul>
                <Screenshot description="Course video player with sidebar navigation" />
              </SectionCard>

              <SectionCard title="Taking Quizzes" icon={Zap}>
                <p>Test your knowledge with lesson quizzes.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Quizzes appear at the end of lessons or modules.</li>
                  <li>Questions are auto-graded with instant feedback.</li>
                  <li>Review correct answers and explanations after submission.</li>
                  <li>Quiz scores contribute to your overall course grade.</li>
                </ul>
                <Screenshot description="Quiz interface with multiple choice questions" />
              </SectionCard>

              <SectionCard title="Submitting Assignments" icon={FileText}>
                <p>Complete and submit assignments for instructor grading.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View all assignments from the <strong>Assignments</strong> page in the sidebar.</li>
                  <li>Read the instructions, rubric, and due date for each task.</li>
                  <li>Upload your work (files, links, or text responses).</li>
                  <li>Instructors provide grades and feedback on submissions.</li>
                  <li>Track submission status and resubmit if allowed.</li>
                </ul>
                <Screenshot description="Assignments list and submission form" />
              </SectionCard>

              <SectionCard title="Taking Proctored Exams" icon={Eye}>
                <p>Course exams are proctored to ensure academic integrity.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Navigate to <strong>Exams</strong> from the sidebar.</li>
                  <li>Review the exam rules and time limit before starting.</li>
                  <li>Your webcam and screen will be recorded during the exam.</li>
                  <li>Answer questions within the allotted time.</li>
                  <li>View results and correct answers after submission.</li>
                  <li>Check your exam history and past attempt scores.</li>
                </ul>
                <Screenshot description="Exam interface with proctoring indicator" />
              </SectionCard>

              <SectionCard title="Coding Challenges" icon={Terminal}>
                <p>Sharpen your coding skills with interactive challenges.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access challenges from the sidebar.</li>
                  <li>Choose from various difficulty levels and topics.</li>
                  <li>Write code directly in the browser-based editor.</li>
                  <li>Run tests to validate your solution.</li>
                  <li>Submit your solution and earn XP.</li>
                </ul>
                <Screenshot description="Coding challenge editor with test runner" />
              </SectionCard>

              <SectionCard title="Earning Certificates" icon={Award}>
                <p>Upon completing a course, you earn a verified certificate.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Certificates appear in your <strong>Certificates</strong> page automatically.</li>
                  <li>Download as PDF or share directly on LinkedIn.</li>
                  <li>Each certificate has a unique verification code.</li>
                  <li>Employers can verify certificates at the <strong>Verify Certificate</strong> page.</li>
                  <li>Certificates are recognized by industry partners.</li>
                </ul>
                <Screenshot description="Certificates page with download options" />
              </SectionCard>

              <SectionCard title="Learning Paths" icon={Target}>
                <p>Follow structured curriculum paths designed by experts.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Learning paths group related courses into a guided journey.</li>
                  <li>Track your overall progress across all courses in the path.</li>
                  <li>Complete prerequisite courses before advancing.</li>
                  <li>Earn a specialization badge upon completing a full path.</li>
                </ul>
                <Screenshot description="Learning paths overview page" />
              </SectionCard>

              <SectionCard title="Leaderboard & Gamification" icon={Star}>
                <p>Compete with fellow learners and track your rank.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View the <strong>Leaderboard</strong> from the sidebar.</li>
                  <li>See your rank compared to all students.</li>
                  <li>Earn XP for lessons, quizzes, assignments, and streaks.</li>
                  <li>Unlock badges and achievements for specific milestones.</li>
                  <li>Check rank changes over time.</li>
                </ul>
                <Screenshot description="Leaderboard showing student rankings" />
              </SectionCard>

              <SectionCard title="Calendar" icon={Calendar}>
                <p>Stay on top of deadlines and events.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The <strong>Calendar</strong> shows all your upcoming deadlines in one place.</li>
                  <li>View assignment due dates, exam schedules, and live class times.</li>
                  <li>Filter by course or event type.</li>
                  <li>Click an event to view details and take action.</li>
                </ul>
                <Screenshot description="Calendar view with deadlines" />
              </SectionCard>

              <SectionCard title="Notifications" icon={Bell}>
                <p>Real-time alerts keep you informed.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The bell icon in the top navbar shows unread notifications.</li>
                  <li>Get notified about: assignment grades, exam results, announcements, messages.</li>
                  <li>Click a notification to navigate directly to the relevant page.</li>
                  <li>Configure notification preferences in <strong>Settings</strong>.</li>
                </ul>
                <Screenshot description="Notifications dropdown" />
              </SectionCard>

              <SectionCard title="Messaging" icon={MessageCircle}>
                <p>Communicate directly with instructors and peers.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access <strong>Messages</strong> from the sidebar.</li>
                  <li>Start a new conversation with an instructor or classmate.</li>
                  <li>Real-time messaging powered by WebSocket.</li>
                  <li>Share files and code snippets in chat.</li>
                  <li>View message history across all conversations.</li>
                </ul>
                <Screenshot description="Messaging interface with chat threads" />
              </SectionCard>

              <SectionCard title="Support Tickets" icon={HelpCircle}>
                <p>Need help? Create a support ticket.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Tickets</strong> from the sidebar.</li>
                  <li>Click <strong>Create Ticket</strong> and describe your issue.</li>
                  <li>Track the status of your ticket (open, in progress, resolved).</li>
                  <li>Reply to your ticket thread to provide updates.</li>
                </ul>
                <Screenshot description="Support tickets list and creation form" />
              </SectionCard>

              <SectionCard title="Wishlist" icon={BookMarked}>
                <p>Save courses for later.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Click the heart icon on any course to add it to your wishlist.</li>
                  <li>Access your wishlist from the course catalog page.</li>
                  <li>Enroll when you are ready or when a sale is active.</li>
                </ul>
              </SectionCard>

              <SectionCard title="Profile & Settings" icon={Settings}>
                <p>Manage your personal information and preferences.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Update your avatar, name, and bio from the <strong>Profile</strong> page.</li>
                  <li>Change your password and email preferences in <strong>Settings</strong>.</li>
                  <li>Toggle between light and dark theme.</li>
                  <li>Manage notification preferences for email and in-app alerts.</li>
                </ul>
                <Screenshot description="Student profile page" />
              </SectionCard>

              <div className="text-center mt-10">
                <Link to="/courses">
                  <Button icon={<ArrowRight className="w-4 h-4" />}>Browse Courses</Button>
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'instructor' && (
            <div className="space-y-6">
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-2xl mx-auto">
                Everything you need to create, manage, and sell courses on CareerCode Academy.
              </p>

              <SectionCard title="Instructor Dashboard" icon={Layers}>
                <p>Your instructor dashboard gives you a complete overview of your teaching business.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Active Courses</strong> — number of published courses.</li>
                  <li><strong>Total Students</strong> — learners enrolled across all courses.</li>
                  <li><strong>Revenue</strong> — earnings from course sales.</li>
                  <li><strong>Average Rating</strong> — student satisfaction score.</li>
                  <li><strong>Pending Reviews</strong> — submissions waiting for grading.</li>
                  <li><strong>Enrollment Trends</strong> — charts showing enrollment over time.</li>
                </ul>
                <Screenshot description="Instructor dashboard with metrics" />
              </SectionCard>

              <SectionCard title="Course Management" icon={BookOpen}>
                <p>Create and manage your courses using the course editor.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Courses</strong> in the instructor sidebar.</li>
                  <li>Click <strong>Create New Course</strong> to start building.</li>
                  <li>Add course details: title, description, category, price, thumbnail.</li>
                  <li>Organize content into modules and lessons.</li>
                  <li>Upload videos, add resources, and attach files.</li>
                  <li>Set prerequisites and learning objectives.</li>
                  <li>Preview your course before publishing.</li>
                  <li>Publish when ready, or save as draft for later.</li>
                </ul>
                <Screenshot description="Course editor with module and lesson structure" />
              </SectionCard>

              <SectionCard title="Course Proposals" icon={ClipboardList}>
                <p>Submit new course ideas for admin approval.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Course Proposals</strong> in the sidebar.</li>
                  <li>Submit a proposal outlining the course topic, audience, and outline.</li>
                  <li>Admins review and approve or provide feedback.</li>
                  <li>Once approved, you can create the course using the editor.</li>
                </ul>
                <Screenshot description="Course proposals list" />
              </SectionCard>

              <SectionCard title="Managing Students" icon={Users}>
                <p>View and track student progress in your courses.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The <strong>Students</strong> page lists all enrolled students.</li>
                  <li>See each student's progress, engagement status, and grades.</li>
                  <li>Filter by course and search by name.</li>
                  <li>Click a student to view detailed progress reports.</li>
                </ul>
                <Screenshot description="Students list with progress data" />
              </SectionCard>

              <SectionCard title="Creating Assignments" icon={FileText}>
                <p>Design assignments to assess student understanding.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Assignments</strong> in the sidebar.</li>
                  <li>Click <strong>Create Assignment</strong> and select a course.</li>
                  <li>Add instructions, rubric, due date, and max points.</li>
                  <li>Attach reference files if needed.</li>
                  <li>Assign to specific courses or modules.</li>
                </ul>
                <Screenshot description="Assignment creation form" />
              </SectionCard>

              <SectionCard title="Grading Submissions" icon={FileCheck}>
                <p>Review and grade student submissions.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The <strong>Submissions</strong> page shows all pending work.</li>
                  <li>View submitted files and student responses.</li>
                  <li>Assign scores and provide written feedback.</li>
                  <li>Students receive notifications when grades are posted.</li>
                  <li>Track graded vs ungraded submissions.</li>
                </ul>
                <Screenshot description="Submission grading interface" />
              </SectionCard>

              <SectionCard title="Creating Quizzes" icon={Zap}>
                <p>Build quizzes to test knowledge after lessons.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Quizzes</strong> in the sidebar.</li>
                  <li>Create multiple-choice, true/false, and short answer questions.</li>
                  <li>Set time limits, passing scores, and attempt limits.</li>
                  <li>Quizzes are auto-graded for instant student feedback.</li>
                  <li>Attach quizzes to specific lessons or modules.</li>
                </ul>
                <Screenshot description="Quiz builder with question editor" />
              </SectionCard>

              <SectionCard title="Creating & Managing Exams" icon={Eye}>
                <p>Design proctored exams for course completion.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Exams</strong> from the sidebar.</li>
                  <li>Create exam questions with various formats.</li>
                  <li>Set duration, passing score, and proctoring requirements.</li>
                  <li>Review student attempts and scores.</li>
                </ul>
                <Screenshot description="Exam creation page" />
              </SectionCard>

              <SectionCard title="Live Exam Monitoring" icon={Monitor}>
                <p>Monitor students in real-time during proctored exams.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access the <strong>Exam Monitor</strong> to view live sessions.</li>
                  <li>See webcam feeds and screen recordings.</li>
                  <li>Flag suspicious behavior.</li>
                  <li>Review recorded sessions after the exam ends.</li>
                </ul>
                <Screenshot description="Exam monitor with student feeds" />
              </SectionCard>

              <SectionCard title="Scheduling Live Classes" icon={Calendar}>
                <p>Host live interactive sessions with your students.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Live Classes</strong> in the sidebar.</li>
                  <li>Schedule a class with date, time, and duration.</li>
                  <li>Add a meeting link (Zoom, Google Meet, etc.).</li>
                  <li>Mark attendance after the session.</li>
                  <li>Students see live classes in their calendar.</li>
                </ul>
                <Screenshot description="Live class scheduling form" />
              </SectionCard>

              <SectionCard title="Announcements" icon={Megaphone}>
                <p>Send announcements to all enrolled students.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Announcements</strong> in the sidebar.</li>
                  <li>Write a title and message for your announcement.</li>
                  <li>Select which course to broadcast to.</li>
                  <li>Students receive in-app notifications and optional email.</li>
                </ul>
                <Screenshot description="Announcement creation form" />
              </SectionCard>

              <SectionCard title="Messaging Students" icon={MessageSquare}>
                <p>Direct message students for one-on-one communication.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access <strong>Messages</strong> from the sidebar.</li>
                  <li>Search for a student by name.</li>
                  <li>Send files, links, and code snippets.</li>
                  <li>View conversation history.</li>
                </ul>
                <Screenshot description="Instructor messaging interface" />
              </SectionCard>

              <SectionCard title="Analytics" icon={BarChart}>
                <p>Detailed analytics to understand your course performance.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View enrollment trends over time.</li>
                  <li>Track student completion rates.</li>
                  <li>See revenue and payout history.</li>
                  <li>Analyze quiz and exam performance across cohorts.</li>
                  <li>Export reports for external analysis.</li>
                </ul>
                <Screenshot description="Instructor analytics dashboard" />
              </SectionCard>

              <SectionCard title="Payouts" icon={DollarSign}>
                <p>Manage your earnings and withdrawal requests.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Go to <strong>Payouts</strong> in the sidebar.</li>
                  <li>View your available balance and total earnings.</li>
                  <li>Request a payout to your connected payment method.</li>
                  <li>Track payout history and status.</li>
                  <li>Payouts are processed after admin approval.</li>
                </ul>
                <Screenshot description="Payouts page with balance and history" />
              </SectionCard>

              <SectionCard title="Schedule" icon={Clock}>
                <p>View your upcoming classes, deadlines, and events in one place.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The <strong>Schedule</strong> page shows your teaching timeline.</li>
                  <li>See upcoming live classes and assignment due dates.</li>
                  <li>Manage your time effectively across all courses.</li>
                </ul>
                <Screenshot description="Instructor schedule view" />
              </SectionCard>

              <div className="text-center mt-10">
                <Link to="/instructor/dashboard">
                  <Button icon={<ArrowRight className="w-4 h-4" />}>Go to Instructor Dashboard</Button>
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-6">
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-2xl mx-auto">
                Platform administration tools for managing users, courses, payments, and settings.
              </p>

              <SectionCard title="Admin Dashboard" icon={Layers}>
                <p>The admin dashboard provides a high-level overview of the entire platform.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Total Users</strong> — number of registered students, instructors, and admins.</li>
                  <li><strong>Total Courses</strong> — all courses across the platform.</li>
                  <li><strong>Revenue</strong> — platform-wide earnings.</li>
                  <li><strong>Pending Actions</strong> — applications, proposals, and tickets needing review.</li>
                  <li><strong>Recent Activity</strong> — latest actions and registrations.</li>
                </ul>
                <Screenshot description="Admin dashboard with platform metrics" />
              </SectionCard>

              <SectionCard title="User Management" icon={Users}>
                <p>Manage all users on the platform.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View, search, and filter users by role and status.</li>
                  <li>Suspend or activate user accounts.</li>
                  <li>Change user roles (e.g., promote student to instructor).</li>
                  <li>View detailed user profiles and activity logs.</li>
                </ul>
                <Screenshot description="User management table" />
              </SectionCard>

              <SectionCard title="Course Management" icon={BookOpen}>
                <p>Oversee all courses on the platform.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View all courses with status (draft, published, archived).</li>
                  <li>Edit or unpublish courses if needed.</li>
                  <li>Review and approve/reject course proposals.</li>
                  <li>Manage course categories and pricing.</li>
                </ul>
                <Screenshot description="Admin course management page" />
              </SectionCard>

              <SectionCard title="Course Proposals" icon={ClipboardList}>
                <p>Review instructor-submitted course proposals.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View pending proposals with full details.</li>
                  <li>Approve proposals to allow instructors to create courses.</li>
                  <li>Reject with feedback for improvements.</li>
                </ul>
              </SectionCard>

              <SectionCard title="Instructor Applications" icon={Briefcase}>
                <p>Review and process instructor applications.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View applicant details, experience, and qualifications.</li>
                  <li>Approve or reject applications.</li>
                  <li>Approved applicants are upgraded to instructor role.</li>
                </ul>
                <Screenshot description="Instructor applications list" />
              </SectionCard>

              <SectionCard title="Payments" icon={CreditCard}>
                <p>Monitor all payment transactions on the platform.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View complete transaction history.</li>
                  <li>Filter by date, user, course, and payment method.</li>
                  <li>Handle refunds and disputes.</li>
                  <li>Export transaction reports.</li>
                </ul>
                <Screenshot description="Payments transaction list" />
              </SectionCard>

              <SectionCard title="Payouts" icon={DollarSign}>
                <p>Manage instructor payout requests.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Review instructor payout requests.</li>
                  <li>Approve or reject payout requests.</li>
                  <li>Track payout history and platform commission.</li>
                </ul>
                <Screenshot description="Payout management page" />
              </SectionCard>

              <SectionCard title="Certificate Management" icon={Award}>
                <p>Manage student certificates across the platform.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View all issued certificates.</li>
                  <li>Revoke certificates if needed.</li>
                  <li>Verify certificate authenticity.</li>
                </ul>
              </SectionCard>

              <SectionCard title="Certificate Templates" icon={FileText}>
                <p>Design the layout and appearance of course certificates.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Upload organization logo and signature images.</li>
                  <li>Add a stamp or seal.</li>
                  <li>Configure certificate text, colors, and layout.</li>
                  <li>Preview templates before saving.</li>
                </ul>
                <Screenshot description="Certificate template editor" />
              </SectionCard>

              <SectionCard title="Support Tickets" icon={HelpCircle}>
                <p>Manage student and instructor support requests.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View all tickets sorted by status and priority.</li>
                  <li>Reply to tickets and update their status.</li>
                  <li>Assign tickets to support staff.</li>
                </ul>
                <Screenshot description="Support tickets admin view" />
              </SectionCard>

              <SectionCard title="Broadcasts" icon={Megaphone}>
                <p>Send platform-wide announcements to users.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Create broadcast messages with title and content.</li>
                  <li>Target all users or filter by role (students, instructors).</li>
                  <li>Recipients receive in-app notifications and email.</li>
                </ul>
                <Screenshot description="Broadcast creation form" />
              </SectionCard>

              <SectionCard title="Categories" icon={Layers}>
                <p>Organize courses into hierarchical categories.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Create, edit, and delete course categories.</li>
                  <li>Set parent-child relationships between categories.</li>
                  <li>Assign courses to appropriate categories.</li>
                </ul>
                <Screenshot description="Category management page" />
              </SectionCard>

              <SectionCard title="Reports" icon={BarChart}>
                <p>Generate platform-wide reports.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>User growth reports.</li>
                  <li>Course enrollment and completion reports.</li>
                  <li>Revenue and financial summaries.</li>
                  <li>Export reports as CSV or PDF.</li>
                </ul>
                <Screenshot description="Reports page with charts" />
              </SectionCard>

              <SectionCard title="Analytics" icon={Activity}>
                <p>Deep dive into platform analytics.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Revenue trends and forecasts.</li>
                  <li>User acquisition and retention metrics.</li>
                  <li>Course performance comparisons.</li>
                  <li>Interactive charts with date range filters.</li>
                </ul>
                <Screenshot description="Analytics dashboard" />
              </SectionCard>

              <SectionCard title="Audit Log" icon={ScrollText}>
                <p>Track all administrative actions for security and compliance.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View a chronological log of admin actions.</li>
                  <li>Filter by admin user, action type, and date range.</li>
                  <li>See details of what was changed.</li>
                </ul>
                <Screenshot description="Audit log entries" />
              </SectionCard>

              <SectionCard title="Admin Management" icon={ShieldCheck}>
                <p>Manage other administrators (super admin only).</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>View all admin accounts.</li>
                  <li>Create new admin accounts.</li>
                  <li>Remove admin privileges.</li>
                  <li>Assign different admin roles.</li>
                </ul>
              </SectionCard>

              <SectionCard title="Platform Settings" icon={Sliders}>
                <p>Configure global platform settings.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Set platform commission rates for instructors.</li>
                  <li>Configure email and notification defaults.</li>
                  <li>Manage payment gateway settings.</li>
                  <li>Set platform-wide restrictions and policies.</li>
                </ul>
                <Screenshot description="Platform settings page" />
              </SectionCard>

              <div className="text-center mt-10">
                <Link to="/admin/dashboard">
                  <Button icon={<ArrowRight className="w-4 h-4" />}>Go to Admin Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
