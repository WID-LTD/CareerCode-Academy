import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Award, CheckCircle, Flag, Target, Clock, Plus, Minus } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import api from '@/lib/axios';
import { formatDate } from '@/lib/utils';

interface Milestone {
  date: string;
  title: string;
  description: string;
  icon: typeof Flag;
  color: string;
  type: 'start' | 'enrollment' | 'lesson' | 'certificate' | 'first-completed';
}

const STORAGE_KEY = 'roadmap_weekly_goal';

function getStoredGoal(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val) {
      const n = parseInt(val, 10);
      return n > 0 && n <= 168 ? n : 10;
    }
  } catch {}
  return 10;
}

function setStoredGoal(hours: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.max(1, Math.min(168, hours))));
  } catch {}
}

function getIconBg(type: string): string {
  switch (type) {
    case 'start':
      return 'bg-emerald-500/20 text-emerald-500';
    case 'enrollment':
      return 'bg-blue-500/20 text-blue-500';
    case 'lesson':
      return 'bg-purple-500/20 text-purple-500';
    case 'first-completed':
      return 'bg-amber-500/20 text-amber-500';
    case 'certificate':
      return 'bg-rose-500/20 text-rose-500';
    default:
      return 'bg-gray-500/20 text-gray-500';
  }
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemAnim = {
  hidden: { opacity: 0, x: -30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

export default function StudentRoadmap() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(getStoredGoal);

  useEffect(() => {
    setStoredGoal(weeklyGoal);
  }, [weeklyGoal]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/student/dashboard');
        const d = data.data;
        setRecentActivity(d.recentActivity || []);
        setRecentCourses(d.recentCourses || []);
        setWeeklyActivity(d.analytics?.weeklyActivity || []);
        setStats(d.stats || {});
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load roadmap');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const milestones = useMemo<Milestone[]>(() => {
    const items: Milestone[] = [];

    // Hard-coded start milestone
    items.push({
      date: new Date().toISOString(),
      title: 'Started Learning Journey',
      description: 'You embarked on your path to mastering new skills.',
      icon: Flag,
      color: 'emerald',
      type: 'start',
    });

    // Enrollments from recentCourses
    const enrollmentDates = recentCourses
      .filter((c: any) => c.enrolled_at)
      .map((c: any) => ({ date: c.enrolled_at, title: c.title, slug: c.slug }));

    if (enrollmentDates.length > 0) {
      const earliest = enrollmentDates.reduce((a: any, b: any) =>
        new Date(a.date) < new Date(b.date) ? a : b
      );
      items.push({
        date: earliest.date,
        title: `Enrolled in "${earliest.title}"`,
        description: 'Started a new course to expand your knowledge.',
        icon: BookOpen,
        color: 'blue',
        type: 'enrollment',
      });

      // Other enrollments
      enrollmentDates.forEach((e: any) => {
        if (e.date !== earliest.date) {
          items.push({
            date: e.date,
            title: `Enrolled in "${e.title}"`,
            description: 'Joined another course on your learning path.',
            icon: BookOpen,
            color: 'blue',
            type: 'enrollment',
          });
        }
      });
    }

    // Check for first completed course
    const completedCourses = recentCourses.filter((c: any) => c.progress === 100);
    if (completedCourses.length > 0) {
      items.push({
        date: completedCourses[0].enrolled_at || new Date().toISOString(),
        title: 'First Course Completed',
        description: `"${completedCourses[0].title}" — great milestone!`,
        icon: CheckCircle,
        color: 'amber',
        type: 'first-completed',
      });
    }

    // Activity feed
    recentActivity.forEach((act: any) => {
      if (act.type === 'lesson') {
        items.push({
          date: act.created_at,
          title: `Completed lesson in "${act.course_title}"`,
          description: 'One step closer to mastering the material.',
          icon: CheckCircle,
          color: 'purple',
          type: 'lesson',
        });
      } else if (act.type === 'certificate') {
        items.push({
          date: act.created_at,
          title: `Earned certificate for "${act.course_title}"`,
          description: 'Congratulations on this achievement!',
          icon: Award,
          color: 'rose',
          type: 'certificate',
        });
      }
    });

    // Sort by date ascending
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return items;
  }, [recentActivity, recentCourses]);

  const weeklyHours = weeklyActivity.reduce((sum: number, d: any) => sum + (d.hours || 0), 0);
  const goalPercent = Math.min((weeklyHours / weeklyGoal) * 100, 100);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-danger-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Career Roadmap</h1>
        <p className="text-gray-500 mt-1">Your learning journey, visualized as a timeline of milestones.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary-500" />
              Milestones
            </h2>

            {milestones.length === 0 ? (
              <div className="text-center py-10">
                <Flag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No milestones yet</p>
                <p className="text-sm text-gray-400">Enroll in a course to start building your roadmap.</p>
              </div>
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="relative"
              >
                {/* Vertical line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />

                <div className="space-y-0">
                  {milestones.map((ms, i) => {
                    const Icon = ms.icon;
                    const isLast = i === milestones.length - 1;

                    return (
                      <motion.div
                        key={`${ms.type}-${i}`}
                        variants={itemAnim}
                        className="relative flex items-start gap-5 pb-8 last:pb-0"
                      >
                        {/* Dot + icon */}
                        <div className="relative z-10 flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconBg(ms.type)} ring-4 ring-white dark:ring-gray-900`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isLast && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {ms.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{ms.description}</p>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(ms.date)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Set Weekly Goal */}
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-500" />
              Weekly Goal
            </h2>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Target hours</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWeeklyGoal((g) => Math.max(1, g - 1))}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Decrease goal"
                >
                  <Minus className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <span className="text-2xl font-bold tabular-nums text-primary-500 min-w-[3ch] text-center">
                  {weeklyGoal}
                </span>
                <button
                  onClick={() => setWeeklyGoal((g) => Math.min(168, g + 1))}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Increase goal"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">{weeklyHours.toFixed(1)}h / {weeklyGoal}h</span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-1.5">
              {weeklyHours >= weeklyGoal
                ? 'Great job — you hit your weekly target!'
                : `${(weeklyGoal - weeklyHours).toFixed(1)}h more to reach your goal`}
            </p>
          </GlassCard>

          {/* Stats Summary */}
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-lg font-semibold mb-4">Learning Summary</h2>
            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-center">
                  <div className="text-lg font-bold text-blue-500">{stats.enrolledCourses || 0}</div>
                  <div className="text-xs text-gray-500">Enrolled</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-center">
                  <div className="text-lg font-bold text-amber-500">{stats.completedCourses || 0}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 text-center">
                  <div className="text-lg font-bold text-purple-500">{stats.completedLessons || 0}</div>
                  <div className="text-xs text-gray-500">Lessons</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 text-center">
                  <div className="text-lg font-bold text-rose-500">{stats.certificates || 0}</div>
                  <div className="text-xs text-gray-500">Certificates</div>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
