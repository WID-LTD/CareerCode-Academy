import { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, ChevronRight, ChevronLeft, Play, Calendar,
  Clock, AlertCircle, RefreshCw, Target,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useStudentStore } from '@/store/studentStore';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import { HeroSection } from '@/components/student/HeroSection';
import { StatsCards } from '@/components/student/StatsCards';
import { LearningAnalytics } from '@/components/student/LearningAnalytics';
import { RecommendedCourses } from '@/components/student/RecommendedCourses';
import { AchievementCenter } from '@/components/student/AchievementCenter';
import { AIStudyAssistant } from '@/components/student/AIStudyAssistant';
import { HeroSkeleton, StatsSkeleton, CardSkeleton, ChartSkeleton } from '@/components/student/SkeletonLoader';

function ProgressRing({ progress, size = 56, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-primary-500 transition-all duration-700" />
    </svg>
  );
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const {
    stats, recentCourses, recentActivity, upcomingAssignments,
    isLoading, error, fetchDashboard,
  } = useStudentStore();
  const { socket } = useSocket();
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchDashboard();
    socket.on('student:dashboard:update', handler);
    return () => { socket.off('student:dashboard:update', handler); };
  }, [socket, fetchDashboard]);

  if (isLoading && !stats) {
    return (
      <div className="space-y-8" role="status" aria-label="Loading dashboard">
        <HeroSkeleton />
        <StatsSkeleton />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CardSkeleton />
            <ChartSkeleton />
          </div>
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-danger-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchDashboard} icon={<RefreshCw className="w-4 h-4" />}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const coursesInProgress = recentCourses.filter(c => c.progress > 0 && c.progress < 100);
  const newCourses = recentCourses.filter(c => c.progress === 0);
  const completedCount = recentCourses.filter(c => c.progress === 100).length;

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Hero Welcome Section */}
      <HeroSection />

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Continue Learning */}
      {coursesInProgress.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Continue Learning</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollCarousel('left')}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory"
            role="list"
            aria-label="Active courses"
          >
            {coursesInProgress.map((course) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-shrink-0 w-[280px] snap-start"
                role="listitem"
              >
                <Link to={`/student/courses/${course.slug}`} className="block group">
                  <GlassCard className="p-5 h-full" hover>
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        <ProgressRing progress={course.progress} size={64} strokeWidth={5} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-500">
                          {course.progress}%
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary-600 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 truncate">{course.instructor_name}</p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                          <Play className="w-3 h-3" />
                          <span>{course.progress}% complete</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 w-full">
                      <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium group-hover:bg-primary-500/20 transition-colors">
                        <Play className="w-4 h-4" />
                        Resume
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Learning Analytics */}
      <LearningAnalytics />

      {/* Recommended Courses */}
      <RecommendedCourses />

      {/* Achievement Center */}
      <AchievementCenter />

      {/* Main Grid: My Learning + Sidebar */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Learning */}
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">
                {newCourses.length > 0 ? 'All Courses' : 'My Learning'}
              </h2>
              <Link to="/student/courses" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {recentCourses.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-1 font-medium">No courses yet</p>
                <p className="text-sm text-gray-400 mb-5">Enroll in a course to start learning.</p>
                <Link to="/courses">
                  <Button>Browse Courses</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/student/courses/${course.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 hover:bg-primary-500/5 transition-all group"
                  >
                    <div className="relative flex-shrink-0">
                      <ProgressRing progress={course.progress} size={48} strokeWidth={4} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary-500">
                        {course.progress}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm group-hover:text-primary-600 transition-colors truncate">
                        {course.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">{course.instructor_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {course.progress === 100 ? (
                        <Badge variant="success" size="sm">Completed</Badge>
                      ) : course.progress > 0 ? (
                        <span className="text-xs text-gray-400">{course.progress}%</span>
                      ) : (
                        <Badge variant="primary" size="sm">Start</Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-lg font-semibold mb-5">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-gray-400 py-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  No activity yet. Start learning!
                </div>
              ) : (
                recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'enrollment'
                        ? 'bg-blue-500/10 text-blue-500'
                        : activity.type === 'lesson'
                        ? 'bg-purple-500/10 text-purple-500'
                        : 'bg-success-500/10 text-success-500'
                    }`}>
                      {activity.type === 'enrollment'
                        ? <BookOpen className="w-4 h-4" />
                        : <Target className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-900 dark:text-gray-100">
                        {activity.type === 'enrollment' ? 'Enrolled in' :
                         activity.type === 'lesson' ? 'Completed lesson in' :
                         'Earned certificate for'}
                      </span>
                      <span className="text-gray-500"> {activity.course_title}</span>
                    </div>
                    <span className="text-gray-400 text-xs flex-shrink-0">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                <Calendar className="w-4 h-4 inline mr-2 -mt-0.5 text-gray-400" />
                Upcoming Deadlines
              </h2>
              <Link to="/student/assignments" className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingAssignments.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No upcoming deadlines.</p>
              ) : (
                upcomingAssignments.slice(0, 4).map((assignment) => {
                  const dueDate = new Date(assignment.due_date);
                  const now = new Date();
                  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const urgencyColor = diffDays <= 1 ? 'danger' : diffDays <= 3 ? 'warning' : 'primary';
                  const urgencyBg = diffDays <= 1 ? 'bg-danger-50/50 dark:bg-danger-900/10 border-danger-100 dark:border-danger-900/30' :
                    diffDays <= 3 ? 'bg-warning-50/50 dark:bg-warning-900/10 border-warning-100 dark:border-warning-900/30' :
                    'bg-gray-50/50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800';

                  return (
                    <div key={assignment.id} className={`p-3 rounded-xl ${urgencyBg} border`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{assignment.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{assignment.course_title}</p>
                        </div>
                        <Badge variant={urgencyColor as any} size="sm">
                          {diffDays <= 0 ? 'Due today' : `${diffDays}d left`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-500">
                        <Calendar className="w-3 h-3" />
                        Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>

          {/* Learning Stats */}
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-lg font-semibold mb-4">
              <Target className="w-4 h-4 inline mr-2 -mt-0.5 text-gray-400" />
              Learning Stats
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Overall Progress</span>
                  <span className="font-medium">{stats?.averageProgress || 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                    style={{ width: `${stats?.averageProgress || 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="text-lg font-bold text-primary-500">{stats?.enrolledCourses || 0}</div>
                  <div className="text-xs text-gray-500">Enrolled</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="text-lg font-bold text-success-500">{completedCount}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="text-lg font-bold text-purple-500">{stats?.completedLessons || 0}</div>
                  <div className="text-xs text-gray-500">Lessons</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="text-lg font-bold text-amber-500">{stats?.certificates || 0}</div>
                  <div className="text-xs text-gray-500">Certificates</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* AI Study Assistant (Floating) */}
      <AIStudyAssistant />
    </motion.div>
  );
}
