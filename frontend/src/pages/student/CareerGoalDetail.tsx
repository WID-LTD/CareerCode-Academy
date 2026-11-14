import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, BookOpen, Clock, Users, ChevronLeft, CheckCircle, PlayCircle,
  Lock, ArrowRight, Trophy, Zap, Briefcase, LayoutDashboard, Server, Layers,
  Smartphone, Boxes, ShieldCheck, BarChart3, FlaskConical, BrainCircuit, Brain,
  Palette, PenTool,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const goalIcons: Record<string, any> = {
  LayoutDashboard, Server, Layers, Smartphone, Boxes, ShieldCheck,
  BarChart3, FlaskConical, BrainCircuit, Brain, Palette, PenTool,
};

const phaseMeta: Record<string, { label: string; color: string; bg: string }> = {
  foundations: { label: 'Foundations', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  core: { label: 'Core Skills', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  build: { label: 'Build Your Portfolio', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  hire: { label: 'Get Hired', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
};

const phaseOrder = ['foundations', 'core', 'build', 'hire'];

export default function CareerGoalDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [goal, setGoal] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [goalRes, enrolledRes] = await Promise.all([
          api.get(`/career-goals/${slug}`),
          isAuthenticated ? api.get('/learning-paths/my/enrollments').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        ]);
        setGoal(goalRes.data.data);
        const enrolled = enrolledRes.data.data?.find((e: any) => e.slug === goalRes.data.data?.path_slug);
        setEnrollment(enrolled || null);
      } catch {
        toast.error('Failed to load career goal');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [slug, isAuthenticated]);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post(`/career-goals/${slug}/enroll`);
      const { paidCourses = [], enrolledCourseIds = [] } = res.data.data || {};
      if (enrolledCourseIds.length > 0) {
        toast.success(`You're pursuing this goal! ${enrolledCourseIds.length} free course(s) unlocked.`);
      } else {
        toast.success('Career goal started — good luck!');
      }
      if (paidCourses.length > 0) {
        toast(`Complete payment for ${paidCourses.length} paid course(s) to continue.`, { icon: '🔒' });
      }
      const enrolledRes = await api.get('/learning-paths/my/enrollments');
      const enrolled = enrolledRes.data.data?.find((e: any) => e.slug === goal?.path_slug);
      setEnrollment(enrolled || null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start career goal');
    }
  };

  if (isLoading) return <PageSkeleton />;
  if (!goal) return <div className="text-center py-20 text-gray-500">Career goal not found.</div>;

  const RoleIcon = goalIcons[goal.icon] || Target;
  const courses = goal.courses || [];
  const completedCount = enrollment?.courses?.filter((c: any) => c.completed).length || 0;
  const grouped = phaseOrder
    .map((phase) => ({ phase, meta: phaseMeta[phase], courses: courses.filter((c: any) => (c.phase || 'core') === phase) }))
    .filter((g) => g.courses.length > 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Link to="/student/learning-paths" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to Learning Paths
      </Link>

      {/* Header */}
      <GlassCard className="p-6 mb-6 overflow-hidden relative">
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${goal.color || 'from-blue-600 to-cyan-600'}`} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <RoleIcon className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold break-words">{goal.title}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="primary">{goal.role_title}</Badge>
                  {goal.school_name && <Badge variant="default">{goal.school_name}</Badge>}
                </div>
              </div>
            </div>
            <p className="text-gray-500 mt-2 max-w-2xl">{goal.summary}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {goal.courses_count || courses.length} courses</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {Math.floor((goal.total_duration || 0) / 60)} hours</span>
              {goal.duration_estimate && (
                <span className="flex items-center gap-1"><Target className="w-4 h-4" /> {goal.duration_estimate}</span>
              )}
              {goal.salary_band && (
                <span className="flex items-center gap-1 text-amber-600"><Briefcase className="w-4 h-4" /> Avg salary: {goal.salary_band}</span>
              )}
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {goal.students_count || 0} students</span>
            </div>

            {goal.desired_skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {goal.desired_skills.map((s: string) => (
                  <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20">{s}</span>
                ))}
              </div>
            )}

            {/* Enrollment progress */}
            {enrollment && (
              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Goal progress</span>
                  <span className="font-medium">{completedCount}/{courses.length} courses completed</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                    style={{ width: `${enrollment.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {isAuthenticated && goal.path_slug && (
              <Button variant="neon" size="sm" onClick={() => navigate(`/student/guided/${goal.path_slug}`)}>
                <Zap className="w-4 h-4 mr-2" /> {enrollment ? 'Open Guided Mode' : 'Start Guided Mode'}
              </Button>
            )}
            {!enrollment && (
              <Button variant="primary" onClick={handleEnroll} disabled={!isAuthenticated}>
                <PlayCircle className="w-4 h-4 mr-2" /> Start This Career Goal
              </Button>
            )}
            {goal.path_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/checkout?pathId=${goal.path_id}`)}
              >
                <Lock className="w-4 h-4 mr-2" /> Buy all courses in this pathway
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Career goal achieved */ }
      {enrollment?.completed && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <GlassCard className="p-6 mb-6 border-2 border-success-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-success-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-success-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-success-600 dark:text-success-400">Career Goal Achieved!</h2>
                  <p className="text-sm text-gray-500">You completed the "{goal.role_title}" pathway — you&apos;re job-ready. 150 XP awarded.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/career/jobs')}>
                Explore Jobs <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Phase-grouped course timeline */}
      {grouped.map((group) => (
        <section key={group.phase} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-7 h-7 rounded-lg ${group.meta.bg} flex items-center justify-center`}>
              <Zap className={`w-4 h-4 ${group.meta.color}`} />
            </span>
            <h2 className="font-semibold">{group.meta.label}</h2>
            <Badge variant="default" size="sm">{group.courses.length} courses</Badge>
          </div>
          <div className="space-y-3">
            {group.courses.map((course: any, i: number) => {
              const enrollmentCourse = enrollment?.courses?.find((c: any) => c.id === course.id);
              const isCompleted = enrollmentCourse?.completed;
              const isEnrolled = enrollmentCourse?.progress !== null && enrollmentCourse?.progress !== undefined;
              const progress = enrollmentCourse?.progress || 0;

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={isEnrolled ? `/student/courses/${course.slug}` : `/courses/${course.slug}`}
                    className="block group"
                  >
                    <GlassCard className="p-4" hover>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCompleted ? 'bg-success-500 text-white' :
                            isEnrolled ? 'bg-primary-500/20 text-primary-500' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          }`}>
                            {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
                          </div>
                          {i < group.courses.length - 1 && <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-700" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm group-hover:text-primary-600 transition-colors">{course.title}</h3>
                            {isCompleted && <Badge variant="success" size="sm">Completed</Badge>}
                            {isEnrolled && !isCompleted && <Badge variant="primary" size="sm">{progress}%</Badge>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{course.instructor_name} · {course.duration} min · {course.level}{Number(course.price) > 0 && ` · ${formatCurrency(course.price)}`}</p>

                          {isEnrolled && !isCompleted && (
                            <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 max-w-xs">
                              <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {isEnrolled ? (
                            <Button size="sm" variant="outline">
                              {isCompleted ? 'Review' : 'Continue'} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          ) : Number(course.price) > 0 ? (
                            <Button size="sm" variant="primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/checkout?courseId=${course.id}`); }}>
                              <Lock className="w-3.5 h-3.5 mr-1" /> Pay {formatCurrency(course.price)}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline">
                              View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}

      {courses.length === 0 && (
        <div className="text-center py-12 text-gray-500">No courses in this career goal yet.</div>
      )}
    </motion.div>
  );
}