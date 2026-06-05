import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, DollarSign, TrendingUp, Star, Activity, Clock } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';

const stats = [
  { icon: BookOpen, label: 'Active Courses', value: '6', change: '+2', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Users, label: 'Total Students', value: '1,247', change: '+12%', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: DollarSign, label: 'Revenue', value: '$38,450', change: '+8%', color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: TrendingUp, label: 'Avg Rating', value: '4.8', change: '+0.2', color: 'text-orange-500', bg: 'bg-orange-500/10' },
];

const recentActivity = [
  { action: 'New enrollment', details: 'John Doe enrolled in Full-Stack Web Dev', time: '10 min ago', type: 'enrollment' },
  { action: 'Assignment submitted', details: 'Emma Wilson submitted React Project', time: '1 hour ago', type: 'submission' },
  { action: 'Course review', details: 'Michael Chen rated your course 5 stars', time: '3 hours ago', type: 'review' },
  { action: 'New question', details: 'Sarah asked about CSS Grid in forum', time: '5 hours ago', type: 'question' },
];

const topCourses = [
  { title: 'Full-Stack Web Development', students: 342, rating: 4.9, revenue: '$12,450', trend: 'up' },
  { title: 'Data Science & ML', students: 287, rating: 4.8, revenue: '$9,800', trend: 'up' },
  { title: 'Mobile App Development', students: 198, rating: 4.7, revenue: '$6,200', trend: 'up' },
];

export default function InstructorDashboard() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Instructor Dashboard</h1>
        <p className="text-gray-500">Welcome back, Dr. Rivera! Here's your overview.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <GlassCard key={stat.label} className="p-5" hover={false}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <Badge variant="success" size="sm">{stat.change}</Badge>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Top Performing Courses</h2>
              <Badge variant="primary" size="sm">This Month</Badge>
            </div>
            <div className="space-y-4">
              {topCourses.map((course) => (
                <div key={course.title} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{course.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.students}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {course.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{course.revenue}</div>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'enrollment' ? 'bg-green-500/10 text-green-500' :
                    activity.type === 'submission' ? 'bg-blue-500/10 text-blue-500' :
                    activity.type === 'review' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-purple-500/10 text-purple-500'
                  }`}>
                    {activity.type === 'enrollment' ? <Users className="w-4 h-4" /> :
                     activity.type === 'submission' ? <BookOpen className="w-4 h-4" /> :
                     activity.type === 'review' ? <Star className="w-4 h-4" /> :
                     <Activity className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{activity.action}</div>
                    <div className="text-gray-500">{activity.details}</div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">{activity.time}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Pending reviews</span>
                <Badge variant="warning" size="sm">12</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Unread messages</span>
                <Badge variant="primary" size="sm">5</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Upcoming live sessions</span>
                <Badge variant="default" size="sm">3</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Assignments to grade</span>
                <Badge variant="danger" size="sm">18</Badge>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Schedule</h2>
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Today, 2:00 PM</div>
                <div className="font-medium text-sm">Live Q&A Session</div>
                <div className="text-xs text-gray-500">Full-Stack Web Dev</div>
              </div>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Tomorrow, 10:00 AM</div>
                <div className="font-medium text-sm">Code Review Workshop</div>
                <div className="text-xs text-gray-500">Data Science & ML</div>
              </div>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-xs text-gray-400 mb-1">Jun 10, 3:00 PM</div>
                <div className="font-medium text-sm">1-on-1 Mentorship</div>
                <div className="text-xs text-gray-500">Student: Emma Wilson</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
