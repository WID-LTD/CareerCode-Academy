import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock, Award, TrendingUp, Play, ChevronRight,
  Calendar, FileText, Star,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const stats = [
  { icon: BookOpen, label: 'Enrolled Courses', value: '4', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Clock, label: 'Hours Learned', value: '128', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: Award, label: 'Certificates', value: '2', color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: TrendingUp, label: 'Course Progress', value: '68%', color: 'text-orange-500', bg: 'bg-orange-500/10' },
];

const recentCourses = [
  { title: 'Full-Stack Web Development', progress: 75, nextLesson: 'React Hooks Deep Dive', instructor: 'Dr. Alex Rivera', color: 'from-blue-500 to-cyan-500' },
  { title: 'Data Science & ML', progress: 45, nextLesson: 'Linear Regression Models', instructor: 'Maya Patel', color: 'from-purple-500 to-pink-500' },
  { title: 'UI/UX Design', progress: 20, nextLesson: 'Design Systems Introduction', instructor: 'David Kim', color: 'from-pink-500 to-rose-500' },
];

const upcomingAssignments = [
  { title: 'React Component Library', course: 'Full-Stack Web Dev', due: '2025-06-10', status: 'pending' },
  { title: 'Data Analysis Report', course: 'Data Science & ML', due: '2025-06-15', status: 'in-progress' },
  { title: 'Mobile App Wireframe', course: 'UI/UX Design', due: '2025-06-20', status: 'not-started' },
];

const recentActivity = [
  { action: 'Completed lesson: React Hooks', course: 'Full-Stack Web Dev', time: '2 hours ago', type: 'lesson' },
  { action: 'Submitted assignment: CSS Grid', course: 'Full-Stack Web Dev', time: '1 day ago', type: 'assignment' },
  { action: 'Earned certificate: HTML/CSS', course: 'Web Fundamentals', time: '3 days ago', type: 'certificate' },
  { action: 'Started course: UI/UX Design', course: 'UI/UX Design', time: '5 days ago', type: 'course' },
];

export default function StudentDashboard() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, Sarah! 👋</h1>
        <p className="text-gray-500">Here's your learning progress overview.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <GlassCard key={stat.label} className="p-5 flex items-center gap-4" hover={false}>
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">My Courses</h2>
              <Link to="/student/courses" className="text-sm text-primary-500 hover:underline">View all</Link>
            </div>
            <div className="space-y-4">
              {recentCourses.map((course) => (
                <div key={course.title} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center flex-shrink-0`}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{course.title}</h3>
                    <p className="text-xs text-gray-500">{course.instructor}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full gradient-bg rounded-full" style={{ width: `${course.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-500">{course.progress}%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Next: {course.nextLesson}</p>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Play className="w-4 h-4 text-primary-500" />
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
            </div>
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'lesson' ? 'bg-blue-500/10 text-blue-500' :
                    activity.type === 'assignment' ? 'bg-purple-500/10 text-purple-500' :
                    activity.type === 'certificate' ? 'bg-green-500/10 text-green-500' :
                    'bg-orange-500/10 text-orange-500'
                  }`}>
                    {activity.type === 'lesson' ? <Play className="w-4 h-4" /> :
                     activity.type === 'assignment' ? <FileText className="w-4 h-4" /> :
                     activity.type === 'certificate' ? <Award className="w-4 h-4" /> :
                     <BookOpen className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-900 dark:text-gray-100">{activity.action}</span>
                    <span className="text-gray-400"> · {activity.course}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{activity.time}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Upcoming Assignments</h2>
              <Link to="/student/assignments" className="text-sm text-primary-500 hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => (
                <div key={assignment.title} className="p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-sm">{assignment.title}</h3>
                    <Badge variant={
                      assignment.status === 'pending' ? 'warning' :
                      assignment.status === 'in-progress' ? 'primary' : 'default'
                    } size="sm">
                      {assignment.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{assignment.course}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                    <Calendar className="w-3 h-3" /> Due: {assignment.due}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Learning Streak</h2>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-1">7</div>
              <div className="text-sm text-gray-500 mb-4">day streak</div>
              <div className="flex justify-center gap-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                    i < 4 ? 'bg-primary-500 text-white' : i === 4 ? 'bg-primary-500/50 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
