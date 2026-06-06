import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock, Award, TrendingUp, Play,
  Calendar, FileText, Star, User,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useStudentStore } from '@/store/studentStore';
import { useAuthStore } from '@/store/authStore';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { stats, recentCourses, recentActivity, upcomingAssignments, notifications, isLoading, fetchDashboard } = useStudentStore();
  const announcements = notifications.filter(n => n.type === 'info').slice(0, 5);

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const statCards = [
    { icon: BookOpen, label: 'Enrolled Courses', value: stats.enrolledCourses.toString(), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Clock, label: 'Lessons Completed', value: stats.completedLessons.toString(), color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Award, label: 'Certificates', value: stats.certificates.toString(), color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: TrendingUp, label: 'Avg Progress', value: `${stats.averageProgress}%`, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {user?.name || 'Student'}!</h1>
        <p className="text-gray-500">Here's your learning progress overview.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
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
                <Link key={course.id} to={`/student/courses/${course.slug}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{course.title}</h3>
                    <p className="text-xs text-gray-500">{course.instructor_name}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full gradient-bg rounded-full" style={{ width: `${course.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-500">{course.progress}%</span>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-primary-500" />
                </Link>
              ))}
              {recentCourses.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You are not enrolled in any courses yet.</p>
                  <Link to="/courses"><Button>Browse Courses</Button></Link>
                </div>
              )}
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
                    activity.type === 'enrollment' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-green-500/10 text-green-500'
                  }`}>
                    {activity.type === 'enrollment' ? <BookOpen className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-900 dark:text-gray-100">
                      {activity.type === 'enrollment' ? 'Enrolled in' : 'Earned certificate for'}
                    </span>
                    <span className="text-gray-400"> {activity.course_title}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{new Date(activity.created_at).toLocaleDateString()}</span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-gray-500 text-sm">No activity yet. Start learning!</p>
              )}
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
                <div key={assignment.id} className="p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                  <h3 className="font-medium text-sm mb-1">{assignment.title}</h3>
                  <p className="text-xs text-gray-500">{assignment.course_title}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                    <Calendar className="w-3 h-3" /> Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {upcomingAssignments.length === 0 && (
                <p className="text-gray-500 text-sm">No upcoming assignments.</p>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Announcements</h2>
            </div>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                  <h3 className="font-medium text-sm mb-1 text-blue-900 dark:text-blue-100">{announcement.title}</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 line-clamp-2">{announcement.message}</p>
                  <div className="text-[10px] text-blue-500/70 mt-2">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-gray-500 text-sm">No new announcements.</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
