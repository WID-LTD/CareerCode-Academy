import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GitBranch, BookOpen, Clock, Users, ChevronLeft, CheckCircle, PlayCircle,
  Lock, ArrowRight, Trophy, Zap, ShoppingBag, ListChecks, Sparkles,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function LearningPathDetail({ variant = 'student' }: { variant?: 'public' | 'student' }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [path, setPath] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pathRes, enrolledRes] = await Promise.all([
        api.get(`/learning-paths/${slug}`),
        isAuthenticated ? api.get('/learning-paths/my/enrollments').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
      ]);
      setPath(pathRes.data.data);
      const enrolled = enrolledRes.data.data?.find((e: any) => e.slug === slug);
      setEnrollment(enrolled || null);
    } catch {
      toast.error('Failed to load learning path');
    } finally {
      setIsLoading(false);
    }
  }, [slug, isAuthenticated]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const pricing = path?.pricing || {};
  const courses = pricing.courses || path?.courses || [];
  const completedCount = enrollment?.courses?.filter((c: any) => c.completed).length || 0;
  const owned = new Set<string>((courses || []).filter((c: any) => c.owned).map((c: any) => c.id));
  const freeCourses = (courses || []).filter((c: any) => Number(c.price) <= 0);
  const paidUnpaid = (courses || []).filter((c: any) => Number(c.price) > 0 && !owned.has(c.id));

  const refreshEnrollment = async () => {
    if (!isAuthenticated) return;
    const enrolledRes = await api.get('/learning-paths/my/enrollments').catch(() => ({ data: { data: [] } }));
    const enrolled = enrolledRes.data.data?.find((e: any) => e.slug === slug);
    setEnrollment(enrolled || null);
  };

  const enrollFree = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setBusy('free');
    try {
      const res = await api.post(`/learning-paths/${slug}/enroll`, { mode: 'free' });
      const n = res.data.data?.enrolledCourseIds?.length || 0;
      toast.success(n ? `Enrolled — ${n} free course(s) unlocked` : 'Enrolled in this path');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to enroll');
    } finally { setBusy(null); }
  };

  const buyAll = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    navigate(`/checkout?pathId=${path.id}`);
  };

  const singleCourse = async (course: any) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (course.owned || owned.has(course.id)) {
      navigate(`/student/courses/${course.slug}`);
      return;
    }
    if (Number(course.price) > 0) {
      navigate(`/checkout?courseId=${course.id}&pathId=${path.id}`);
      return;
    }
    setBusy(course.id);
    try {
      await api.post(`/learning-paths/${slug}/courses/${course.id}/enroll`);
      toast.success(`Enrolled in ${course.title}`);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to enroll');
    } finally { setBusy(null); }
  };

  const addToTodo = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setBusy('todo');
    try {
      const { data } = await api.post(`/todos/generate/path/${slug}`);
      toast.success(data.message || 'Path tasks added to To-Do');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add tasks');
    } finally { setBusy(null); }
  };

  if (isLoading) return <PageSkeleton />;
  if (!path) return <div className="text-center py-20 text-gray-500">Learning path not found.</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {variant === 'public' ? (
        <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Courses
        </Link>
      ) : (
        <Link to="/student/learning-paths" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Learning Paths
        </Link>
      )}

      <GlassCard className="p-6 mb-6 overflow-hidden relative">
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${path.color || 'from-blue-600 to-cyan-600'}`} />
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6 mt-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold break-words">{path.title}</h1>
                <Badge className="capitalize">{path.level}</Badge>
              </div>
            </div>
            <p className="text-gray-500 mt-2 max-w-2xl">{path.description}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {courses.length} courses</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {Math.floor((path.total_duration || 0) / 60)} hours</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {path.students_count || 0} students</span>
              {Number(pricing.savings) > 0 && <span className="text-emerald-600 font-medium">Save {formatCurrency(pricing.savings)}</span>}
            </div>

            {enrollment && (
              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{completedCount}/{courses.length} completed</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700" style={{ width: `${enrollment.progress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-white/60 dark:bg-gray-900/40">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Path enrolment</p>
            {paidUnpaid.length > 0 ? (
              <>
                <p className="text-2xl font-bold mt-1">{formatCurrency(pricing.bundle_price)}</p>
                <p className="text-xs text-gray-500 line-through">{formatCurrency(pricing.full_price)}</p>
                <p className="text-xs text-emerald-600 mt-1">All {paidUnpaid.length} paid course(s) in one payment</p>
              </>
            ) : (
              <p className="text-lg font-bold mt-1 text-emerald-600">All courses owned</p>
            )}
            <div className="mt-4 space-y-2">
              {paidUnpaid.length > 0 && (
                <Button className="w-full" onClick={buyAll}>
                  <ShoppingBag className="w-4 h-4 mr-2" /> Pay for all courses
                </Button>
              )}
              {freeCourses.length > 0 && !enrollment && (
                <Button className="w-full" variant="outline" onClick={enrollFree} disabled={busy === 'free'}>
                  <PlayCircle className="w-4 h-4 mr-2" /> {busy === 'free' ? 'Enrolling…' : `Enroll free courses (${freeCourses.length})`}
                </Button>
              )}
              {!enrollment && paidUnpaid.length === 0 && (
                <Button className="w-full" onClick={enrollFree} disabled={busy === 'free'}>
                  <PlayCircle className="w-4 h-4 mr-2" /> Enroll in path
                </Button>
              )}
              {enrollment && (
                <Button className="w-full" variant="neon" onClick={() => navigate(`/student/guided/${path.slug}`)}>
                  <Zap className="w-4 h-4 mr-2" /> Open Guided Mode
                </Button>
              )}
              {isAuthenticated && (
                <Button className="w-full" variant="ghost" size="sm" onClick={addToTodo} disabled={busy === 'todo'}>
                  <ListChecks className="w-4 h-4 mr-2" /> {busy === 'todo' ? 'Adding…' : 'Add path to To-Do'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {enrollment?.completed && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <GlassCard className="p-6 mb-6 border-2 border-success-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-success-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-success-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-success-600 dark:text-success-400">Pathway Completed!</h2>
                  <p className="text-sm text-gray-500">You finished every course in "{path.title}". Great milestone — 150 XP awarded.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/student/certificates')}>
                View Certificates <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Courses in this Path</h2>
        {paidUnpaid.length > 0 && <span className="text-xs text-gray-500">{owned.size} owned · {paidUnpaid.length} to unlock</span>}
      </div>
      <div className="space-y-3">
        {courses.map((course: any, i: number) => {
          const enrollmentCourse = enrollment?.courses?.find((c: any) => c.id === course.id);
          const isCompleted = enrollmentCourse?.completed;
          const isEnrolled = course.owned || (enrollmentCourse?.progress !== null && enrollmentCourse?.progress !== undefined);
          const progress = enrollmentCourse?.progress || 0;

          return (
            <motion.div key={course.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
              <GlassCard className="p-4" hover>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted ? 'bg-success-500 text-white' :
                        isEnrolled ? 'bg-primary-500/20 text-primary-500' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < courses.length - 1 && <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-700" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{course.title}</h3>
                        {isCompleted && <Badge variant="success" size="sm">Completed</Badge>}
                        {isEnrolled && !isCompleted && <Badge variant="primary" size="sm">{progress}%</Badge>}
                        {!isEnrolled && Number(course.price) > 0 && <Badge variant="warning" size="sm">Paid</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {course.instructor_name} · {course.duration} min · {course.level}
                        {Number(course.price) > 0 && ` · ${formatCurrency(course.price)}`}
                      </p>
                      {isEnrolled && !isCompleted && (
                        <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 max-w-xs">
                          <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isEnrolled ? (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/student/courses/${course.slug}`)}>
                        {isCompleted ? 'Review' : 'Continue'} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    ) : Number(course.price) > 0 ? (
                      <Button size="sm" variant="primary" onClick={() => singleCourse(course)} disabled={busy === course.id}>
                        <Lock className="w-3.5 h-3.5 mr-1" /> Pay {formatCurrency(course.price)}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => singleCourse(course)} disabled={busy === course.id}>
                        <Sparkles className="w-3.5 h-3.5 mr-1" /> Enroll free
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}

        {courses.length === 0 && <div className="text-center py-12 text-gray-500">No courses in this path yet.</div>}
      </div>
    </motion.div>
  );
}
