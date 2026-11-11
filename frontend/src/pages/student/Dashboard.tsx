import { useEffect, useRef, useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, ChevronRight, ChevronLeft, Play, Calendar,
  Clock, AlertCircle, RefreshCw, Target, TrendingUp,
  Lightbulb, BookMarked, BarChart3, Sparkles, ListChecks,
  MessageSquare, Trophy, Flame, Award, Zap, Star, CheckCircle2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useStudentStore } from '@/store/studentStore';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import { HeroSection } from '@/components/student/HeroSection';
import CareerGoalWidget from '@/components/student/CareerGoalWidget';
import { StatsCards } from '@/components/student/StatsCards';
import { TodoWidget } from '@/components/todos/TodoWidget';
import { LearningAnalytics } from '@/components/student/LearningAnalytics';
import { RecommendedCourses } from '@/components/student/RecommendedCourses';
import { AchievementCenter } from '@/components/student/AchievementCenter';
import { HeroSkeleton, StatsSkeleton, CardSkeleton, ChartSkeleton } from '@/components/student/SkeletonLoader';
import SEO from '@/components/seo/SEO';

function ProgressRing({ progress, size = 56, strokeWidth = 4, color = 'text-primary-500' }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const safeProgress = Number.isNaN(progress) ? 0 : progress;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${color} transition-all duration-700`} />
    </svg>
  );
}

function WeeklyProgress({ weeklyLessons, weeklyGoal }: { weeklyLessons: number; weeklyGoal: number }) {
  const pct = weeklyGoal > 0 ? Math.min((weeklyLessons / weeklyGoal) * 100, 100) : 0;
  return (
    <GlassCard className="p-5 flex items-center gap-5" hover>
      <div className="relative flex-shrink-0">
        <ProgressRing progress={pct} size={72} strokeWidth={6} color="text-accent-500" />
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-accent-500">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Weekly Progress</p>
        <p className="text-xs text-gray-500 mt-0.5">{weeklyLessons} lessons of {weeklyGoal} goal</p>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
          />
        </div>
        {weeklyLessons >= weeklyGoal && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-success-500 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Goal reached!
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function StreakTracker({ streak, bestStreak, weekly }: { streak: number; bestStreak: number; weekly: { day: string; hours: number }[] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  const hoursByDay = new Map(weekly.map(d => [d.day, d.hours]));
  const weekDays = days.map((d, i) => ({
    day: d,
    lessons: hoursByDay.get(d) || 0,
    isToday: (i + 1) % 7 === today,
  }));

  return (
    <GlassCard className="p-5" hover>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Flame className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <p className="text-lg font-bold text-orange-500">{streak} days</p>
          <p className="text-xs text-gray-500">Current streak · Best: {bestStreak}d</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {weekDays.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <div className={cn(
              'w-full h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all',
              d.isToday ? 'ring-2 ring-primary-500/50 ring-offset-1 ring-offset-gray-900' : '',
              d.lessons > 0 ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            )}>
              {d.lessons > 0 ? <Flame className="w-3 h-3" /> : null}
              {d.lessons > 1 ? <span className="ml-0.5 tabular-nums">{d.lessons}</span> : null}
            </div>
            <span className={cn('text-[10px]', d.isToday ? 'text-primary-500 font-medium' : 'text-gray-500')}>{d.day.slice(0, 2)}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const {
    stats, recentCourses, recentActivity, upcomingAssignments,
    weeklyActivity, isLoading, error, fetchDashboard,
  } = useStudentStore();
  const { socket } = useSocket();
  const carouselRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const weeklyGoal = Math.max(1, Math.ceil(((stats?.dailyXpGoal || 50) * 7) / 10));
  const weeklyLessons = weeklyActivity.reduce((sum, d) => sum + d.hours, 0);

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
      <SEO title="Dashboard" />
      <HeroSection />

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      <TodoWidget basePath="/student" />

      {/* My Career Goal */}
      <CareerGoalWidget />

      {/* Streak Tracker + Weekly Progress + Quick Actions Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sm:col-span-1">
          <StreakTracker streak={stats?.currentStreak || 0} bestStreak={stats?.bestStreak || 0} weekly={weeklyActivity} />
        </div>
        <div className="sm:col-span-1">
          <WeeklyProgress weeklyLessons={weeklyLessons} weeklyGoal={weeklyGoal} />
        </div>
        <div className="sm:col-span-2 grid grid-cols-2 gap-3">
          {[
            { label: 'Browse Courses', icon: BookMarked, color: 'text-blue-500', bg: 'bg-blue-500/10', onClick: () => navigate('/courses') },
            { label: 'Take a Quiz', icon: ListChecks, color: 'text-purple-500', bg: 'bg-purple-500/10', onClick: () => navigate('/student/courses') },
            { label: 'Leaderboard', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10', onClick: () => navigate('/student/leaderboard') },
            { label: 'Messages', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10', onClick: () => navigate('/student/messages') },
          ].map((action) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.onClick}
              className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transition-all bg-white/50 dark:bg-gray-900/50"
            >
              <div className={`w-9 h-9 rounded-lg ${action.bg} flex items-center justify-center flex-shrink-0`}>
                <action.icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

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
                className="flex-shrink-0 w-[clamp(240px,40vw,320px)] snap-start"
                role="listitem"
              >
                <Link to={`/student/courses/${course.slug}`} className="block group">
                  <GlassCard className="p-5 h-full" hover>
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        <ProgressRing progress={course.progress} size={64} strokeWidth={5} color="text-primary-500" />
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
                      <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium group-hover:bg-primary-500/20 transition-colors">
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

      <div className="grid lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 5xl:grid-cols-6 gap-4 sm:gap-6">
        <div className="lg:col-span-2 xl:col-span-3 3xl:col-span-4 5xl:col-span-5 space-y-4 sm:space-y-6">
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-10"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-primary-500" />
                </div>
                <p className="text-gray-500 mb-1 font-medium">No courses yet</p>
                <p className="text-sm text-gray-400 mb-5">Start your learning journey today!</p>
                <Link to="/courses">
                  <Button icon={<BookOpen className="w-4 h-4" />}>Browse Courses</Button>
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {recentCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/student/courses/${course.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 hover:bg-primary-500/5 transition-all group"
                  >
                    <div className="relative flex-shrink-0">
                      <ProgressRing progress={course.progress} size={48} strokeWidth={4} color={course.progress === 100 ? 'text-success-500' : 'text-primary-500'} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: course.progress === 100 ? '#10B981' : '#6366f1' }}>
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 text-sm text-gray-400 py-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">No activity yet</p>
                    <p className="text-xs text-gray-400">Complete a lesson to track your progress!</p>
                  </div>
                </motion.div>
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
          {/* Weekly Progress Overview */}
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-lg font-semibold mb-4">
              <Target className="w-4 h-4 inline mr-2 -mt-0.5 text-gray-400" />
              Learning Stats
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Overall Progress</span>
                  <span className="font-medium tabular-nums">{stats?.averageProgress || 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                    style={{ width: `${stats?.averageProgress || 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <div className="text-lg font-bold text-blue-500 tabular-nums">{stats?.enrolledCourses || 0}</div>
                  <div className="text-xs text-gray-500">Enrolled</div>
                </div>
                <div className="p-3 rounded-xl bg-success-500/5 border border-success-500/10">
                  <div className="text-lg font-bold text-success-500 tabular-nums">{completedCount}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <div className="text-lg font-bold text-purple-500 tabular-nums">{stats?.completedLessons || 0}</div>
                  <div className="text-xs text-gray-500">Lessons</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="text-lg font-bold text-amber-500 tabular-nums">{stats?.certificates || 0}</div>
                  <div className="text-xs text-gray-500">Certificates</div>
                </div>
              </div>
            </div>
          </GlassCard>

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
                <div className="flex items-center gap-3 text-sm text-gray-400 py-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">All caught up!</p>
                    <p className="text-xs">No pending deadlines</p>
                  </div>
                </div>
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
        </div>
      </div>

    </motion.div>
  );
}
