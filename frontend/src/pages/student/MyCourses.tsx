import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookOpen, Clock, PlayCircle, Search, Layers, Sparkles, GraduationCap, TrendingUp, Award, ArrowRight, Filter } from 'lucide-react';
import { optimizeImageUrl } from '@/lib/cloudinary';
import { formatCurrency } from '@/lib/utils';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { useCourseStore } from '@/store/courseStore';
import toast from 'react-hot-toast';
import SEO from '@/components/seo/SEO';

const statusColors: Record<string, string> = {
  active: 'bg-success-500/20 text-success-400 border-success-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cancelled: 'bg-danger-500/20 text-danger-400 border-danger-500/30',
  pending: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
};

const categoryGradients: Record<string, string> = {
  'Computer Science': 'from-blue-600 to-purple-600',
  'Web Development': 'from-emerald-600 to-teal-600',
  'Data Science': 'from-orange-600 to-pink-600',
  'Cybersecurity': 'from-danger-600 to-rose-600',
  'Cloud Computing': 'from-sky-600 to-indigo-600',
  'Frontend Development': 'from-blue-600 to-cyan-600',
  'Backend Development': 'from-purple-600 to-indigo-600',
  'Full Stack Development': 'from-pink-600 to-rose-600',
  'Mobile Development': 'from-green-600 to-emerald-600',
  'Data & AI': 'from-violet-600 to-purple-600',
  'UI/UX': 'from-orange-600 to-pink-600',
  'DevOps': 'from-amber-600 to-orange-600',
};

const specCategories = [
  'All',
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'Mobile Development',
  'Data & AI',
  'UI/UX',
  'Cybersecurity',
  'DevOps',
  'Web Development',
  'Data Science',
  'Programming',
];

const difficultyConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger'; dots: number }> = {
  beginner: { label: 'Beginner', variant: 'success', dots: 1 },
  intermediate: { label: 'Intermediate', variant: 'warning', dots: 2 },
  advanced: { label: 'Advanced', variant: 'danger', dots: 3 },
};

export default function MyCourses() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'my' | 'explore'>('my');

  // My Learning state
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unenrollingIds, setUnenrollingIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchMy, setSearchMy] = useState('');
  const [continueCourse, setContinueCourse] = useState<any | null>(null);

  // Explore state
  const [exploreCategory, setExploreCategory] = useState('All');
  const [exploreLevel, setExploreLevel] = useState('All Levels');
  const [exploreSearch, setExploreSearch] = useState('');
  const [explorePage, setExplorePage] = useState(1);

  const { courses, isLoading: coursesLoading, pagination: coursesPagination, fetchCourses } = useCourseStore();

  const handleUnenroll = async (e: React.MouseEvent, courseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to un-enroll from this course? This will delete all your progress.')) return;
    setUnenrollingIds((prev) => [...prev, courseId]);
    try {
      await api.delete(`/courses/${courseId}/enroll`);
      setEnrollments((prev) => prev.filter((item) => (item.course_id || item.course?.id || item.id) !== courseId));
      toast.success('Successfully un-enrolled from course');
      fetchEnrollments();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to un-enroll from course');
    } finally {
      setUnenrollingIds((prev) => prev.filter((id) => id !== courseId));
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [page, pageSize]);

  useEffect(() => {
    if (activeTab === 'explore') {
      fetchCourses({
        category: exploreCategory,
        level: exploreLevel,
        page: explorePage,
        limit: 12,
      });
    }
  }, [activeTab, exploreCategory, exploreLevel, explorePage]);

  const fetchEnrollments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/enrollments?page=${page}&limit=${pageSize}`);
      const list = data.data || [];
      setEnrollments(list);
      if (data.pagination) {
        setTotalItems(data.pagination.total);
        setTotalPages(data.pagination.pages);
      }
      // Determine continue course: most in-progress, or highest progress <100
      if (list.length > 0) {
        const inProgress = list.filter((i: any) => {
          const p = i.progress ?? i.enrollment?.progress ?? 0;
          return p > 0 && p < 100;
        });
        let c = inProgress.length > 0
          ? inProgress.sort((a: any, b: any) => (b.progress || 0) - (a.progress || 0))[0]
          : list.find((i: any) => (i.progress ?? 0) === 0) || list[0];
        setContinueCourse(c);
        // Also try continue-watching API for more accurate last lesson
        try {
          const cw = await api.get('/progress/continue-watching');
          if (cw.data.data && cw.data.data.length > 0) {
            const cwItem = cw.data.data[0];
            const matched = list.find((e: any) => e.course_id === cwItem.course_id || e.course_slug === cwItem.course_slug);
            if (matched) setContinueCourse({ ...matched, _continueWatching: cwItem });
          }
        } catch {}
      } else {
        setContinueCourse(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = useMemo(() => {
    if (!searchMy) return enrollments;
    const q = searchMy.toLowerCase();
    return enrollments.filter((item: any) => {
      const title = (item.course_title || item.title || item.course?.title || '').toLowerCase();
      const cat = (item.category || item.course?.category || '').toLowerCase();
      return title.includes(q) || cat.includes(q);
    });
  }, [enrollments, searchMy]);

  const filteredExplore = useMemo(() => {
    if (!exploreSearch) return courses;
    const q = exploreSearch.toLowerCase();
    return courses.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
  }, [courses, exploreSearch]);

  // Stats for My Learning header
  const stats = useMemo(() => {
    if (enrollments.length === 0) return null;
    const totalProgress = enrollments.reduce((acc: number, cur: any) => acc + (cur.progress || 0), 0) / enrollments.length;
    const completed = enrollments.filter((e: any) => (e.progress || 0) >= 100 || e.status === 'completed' || e.completed).length;
    const inProgress = enrollments.filter((e: any) => (e.progress || 0) > 0 && (e.progress || 0) < 100).length;
    return { avgProgress: Math.round(totalProgress), completed, inProgress, total: enrollments.length };
  }, [enrollments]);

  if (loading && enrollments.length === 0) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="text-center p-8">
          <p className="text-danger-400 mb-4">{error}</p>
          <Button onClick={fetchEnrollments}>Retry</Button>
        </GlassCard>
      </div>
    );
  }

  const tabs = [
    { key: 'my', label: `My Learning${enrollments.length ? ` (${enrollments.length})` : ''}`, icon: GraduationCap },
    { key: 'explore', label: 'Explore Courses', icon: Search },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <SEO title="My Learning | CareerCode Academy" description="Continue your practical learning journey - courses, practice exercises, and real-world projects." />

      {/* Header - Spec §4, §5 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-600 to-secondary-600 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary-500/20 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                My Learning
              </h1>
              <p className="text-white/90 mt-3 text-sm sm:text-base leading-relaxed max-w-2xl">
                Continue your courses, practice your skills, and build real-world projects. Your practical learning journey — <span className="font-semibold">Learn → Practice → Build → Progress.</span>
              </p>
              {stats && (
                <div className="flex flex-wrap gap-3 mt-4">
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-white text-xs font-medium">
                    <TrendingUp className="w-3.5 h-3.5" /> {stats.avgProgress}% avg progress
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-white text-xs font-medium">
                    <PlayCircle className="w-3.5 h-3.5" /> {stats.inProgress} in progress
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-white text-xs font-medium">
                    <Award className="w-3.5 h-3.5" /> {stats.completed} completed
                  </span>
                </div>
              )}
            </div>
            {activeTab === 'my' && enrollments.length > 0 && (
              <div className="hidden sm:flex flex-col gap-2 shrink-0">
                <Button onClick={() => setActiveTab('explore')} variant="secondary" size="sm" className="bg-white text-primary-600 hover:bg-white/90 shadow-lg font-semibold">
                  <Search className="w-4 h-4 mr-1" /> Explore Courses
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Continue Learning Banner - Spec §18 */}
      {activeTab === 'my' && continueCourse && enrollments.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-0 overflow-hidden border-primary-500/20" hover={false}>
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950/30 dark:to-secondary-950/30 px-4 py-3 border-b border-primary-100 dark:border-gray-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">Continue Learning</span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Pick up where you left off</span>
            </div>
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-full sm:w-32 aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center shrink-0 relative">
                {continueCourse.course_thumbnail || continueCourse.thumbnail ? (
                  <img src={optimizeImageUrl(continueCourse.course_thumbnail || continueCourse.thumbnail, 320, 180)} alt={continueCourse.course_title || continueCourse.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-8 h-8 text-white/70" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <PlayCircle className="absolute w-8 h-8 text-white/90" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{continueCourse.course_title || continueCourse.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {continueCourse.total_modules ?? 0} modules</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {continueCourse.total_lessons ?? 0} lessons</span>
                  {continueCourse.level && <><span>•</span><span className="capitalize">{continueCourse.level}</span></>}
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500 dark:text-gray-400">Progress</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{continueCourse.progress || 0}%</span>
                  </div>
                  <ProgressBar value={continueCourse.progress || 0} size="sm" />
                  {(continueCourse.next_lesson_title || continueCourse._continueWatching?.lesson_title) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Next: <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{continueCourse._continueWatching?.lesson_title || continueCourse.next_lesson_title}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex sm:flex-col gap-2 shrink-0">
                <Link to={`/student/courses/${continueCourse.course_slug}`} className="flex-1 sm:flex-none">
                  <Button size="sm" className="w-full sm:w-auto whitespace-nowrap">
                    Continue Learning <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link to={`/student/courses/${continueCourse.course_slug}`} className="hidden sm:block text-center">
                  <span className="text-xs text-gray-500 hover:text-primary-600 transition-colors">View details</span>
                </Link>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Tabs - Spec §6 */}
      <Tabs tabs={tabs as any} activeKey={activeTab} onChange={(k) => setActiveTab(k as any)} variant="pills" className="bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl w-fit" />

      <AnimatePresence mode="wait">
        {activeTab === 'my' ? (
          <motion.div key="my" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Search my learning */}
            {enrollments.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="Search my courses..."
                    value={searchMy}
                    onChange={(e) => setSearchMy(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  <Filter className="w-4 h-4" />
                  {filteredEnrollments.length} of {enrollments.length} courses
                </div>
              </div>
            )}

            {enrollments.length === 0 ? (
              <GlassCard className="text-center py-12 sm:py-16 px-6" hover={false}>
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Start your practical learning journey</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-md mx-auto">You are not enrolled in any courses yet. Browse our catalog to Learn → Practice → Build real projects.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Choose from {specCategories.slice(1, 5).join(', ')} and more</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => setActiveTab('explore')} icon={<Search className="w-4 h-4" />}>
                    Explore Courses
                  </Button>
                  <Link to="/courses">
                    <Button variant="outline">Browse Catalog</Button>
                  </Link>
                </div>
              </GlassCard>
            ) : filteredEnrollments.length === 0 ? (
              <EmptyState
                icon={<Search className="w-8 h-8" />}
                title="No matches"
                description={`No courses matching "${searchMy}"`}
                action={{ label: 'Clear search', onClick: () => setSearchMy('') }}
              />
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredEnrollments.map((item: any, i: number) => {
                    const courseTitle = item.course_title || item.title || item.course?.title || 'Untitled';
                    const slug = item.course_slug || item.slug || item.course?.slug;
                    const thumbnail = item.course_thumbnail || item.thumbnail || item.course?.thumbnail;
                    const category = item.category || item.course?.category || 'General';
                    const progress = item.progress ?? 0;
                    const status = item.status || (progress >= 100 ? 'completed' : 'active');
                    const totalLessons = Number(item.total_lessons ?? item.totalLessons ?? 0);
                    const totalModules = Number(item.total_modules ?? item.total_modules ?? 0);
                    const completedLessons = Number(item.completed_lessons_count ?? (Array.isArray(item.completed_lessons) ? item.completed_lessons.length : 0));
                    const nextLesson = item.next_lesson_title || item._continueWatching?.lesson_title;
                    const level = (item.level || 'beginner').toLowerCase();
                    const diff = difficultyConfig[level] || difficultyConfig.beginner;
                    const isTrial = item.access_type === 'trial';
                    const trialDays = Number(item.trial_days_remaining || 0);

                    return (
                      <motion.div
                        key={item.course_id || item.id || i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <GlassCard className="h-full p-0 overflow-hidden group flex flex-col" hover>
                          <Link to={`/student/courses/${slug}`} className="block">
                            <div className={`aspect-[16/9] bg-gradient-to-br ${categoryGradients[category] || 'from-primary-600 to-secondary-600'} relative overflow-hidden`}>
                              {thumbnail ? (
                                <img src={optimizeImageUrl(thumbnail, 480, 270)} alt={courseTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="w-12 h-12 text-white/40" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                <Badge variant={diff.variant} size="sm" className="backdrop-blur-md bg-white/90 dark:bg-gray-900/80 border-0 font-semibold">
                                  {diff.label}
                                </Badge>
                                {progress >= 100 && (
                                  <Badge variant="success" size="sm" className="backdrop-blur-md bg-emerald-500 text-white border-0">
                                    Completed
                                  </Badge>
                                )}
                                {isTrial && (
                                  <Badge variant="warning" size="sm" className="backdrop-blur-md border-0">
                                    Trial · {trialDays}d left
                                  </Badge>
                                )}
                              </div>
                              <div className="absolute top-3 right-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-md ${statusColors[status] || 'bg-gray-500/20 text-white border-white/20'}`}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </span>
                              </div>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl">
                                  <PlayCircle className="w-6 h-6 text-primary-600 ml-0.5" />
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <h3 className="font-semibold text-white line-clamp-1 text-[15px] drop-shadow">{courseTitle}</h3>
                                <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1.5">
                                  <span className="truncate">{item.instructor_name || category}</span>
                                </p>
                              </div>
                            </div>
                          </Link>

                          <div className="p-4 flex flex-col flex-1">
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                              <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {totalModules} modules</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                              <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {totalLessons} lessons</span>
                              <span className="ml-auto flex items-center gap-0.5">
                                {[1,2,3].map(d => (
                                  <span key={d} className={`w-1.5 h-1.5 rounded-full ${d <= diff.dots ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                                ))}
                              </span>
                            </div>

                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Progress</span>
                                <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
                              </div>
                              <ProgressBar value={progress} size="sm" />
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {completedLessons}/{totalLessons} lessons
                                </span>
                                {progress > 0 && progress < 100 && <span className="text-[11px] text-primary-600 dark:text-primary-400 font-medium">{Math.round(progress)}% complete</span>}
                              </div>
                            </div>

                            {nextLesson ? (
                              <div className="mb-3 p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/30">
                                <p className="text-[11px] font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wide">Up next</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate mt-0.5">{nextLesson}</p>
                              </div>
                            ) : progress >= 100 ? (
                              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                                <Award className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Course completed!</span>
                              </div>
                            ) : (
                              <div className="mb-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Ready to start your first lesson</p>
                              </div>
                            )}

                            <div className="mt-auto flex gap-2">
                              <Link to={`/student/courses/${slug}`} className="flex-1">
                                <Button size="sm" className="w-full">
                                  {progress === 0 ? 'Start Learning' : progress >= 100 ? 'Review Course' : 'Continue Learning'}
                                  <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-3 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                loading={unenrollingIds.includes(item.course_id)}
                                onClick={(e) => handleUnenroll(e, item.course_id)}
                                title="Un-enroll"
                              >
                                {unenrollingIds.includes(item.course_id) ? '' : 'Leave'}
                              </Button>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                />
              </>
            )}
          </motion.div>
        ) : (
          <motion.div key="explore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Explore filters */}
            <GlassCard className="p-4" hover={false}>
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="Search courses by title or category..."
                    value={exploreSearch}
                    onChange={(e) => setExploreSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select
                    value={exploreCategory}
                    onChange={(e: any) => { setExploreCategory(e.target.value); setExplorePage(1); }}
                    options={specCategories.map(c => ({ value: c, label: c }))}
                    className="min-w-[180px]"
                  />
                  <Select
                    value={exploreLevel}
                    onChange={(e: any) => { setExploreLevel(e.target.value); setExplorePage(1); }}
                    options={['All Levels','Beginner','Intermediate','Advanced'].map(l => ({ value: l, label: l }))}
                    className="min-w-[150px]"
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {specCategories.slice(1, 9).map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setExploreCategory(cat); setExplorePage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${exploreCategory === cat ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </GlassCard>

            {coursesLoading ? (
              <div className="flex justify-center py-12">
                <PageSkeleton />
              </div>
            ) : filteredExplore.length === 0 ? (
              <EmptyState
                icon={<Search className="w-8 h-8" />}
                title="No courses found"
                description={exploreSearch ? `No courses matching "${exploreSearch}"` : 'No courses in this category yet.'}
                action={{ label: 'Clear filters', onClick: () => { setExploreSearch(''); setExploreCategory('All'); setExploreLevel('All Levels'); } }}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredExplore.length}</span> of {coursesPagination.total} courses
                  </p>
                  <Link to="/courses" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View full catalog →</Link>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredExplore.map((course: any, i: number) => {
                    const enrolled = enrollments.some((e: any) => e.course_id === course.id);
                    const isFree = Number(course.price) === 0;
                    const discountPercent = Number(course.promotion?.discount_percent || 0);
                    const discountedPrice = Number(course.effective_price ?? (Number(course.price) * (1 - discountPercent / 100)));
                    const diff = difficultyConfig[(course.level || 'beginner').toLowerCase()] || difficultyConfig.beginner;
                    const grad = categoryGradients[course.category] || 'from-gray-500 to-slate-500';
                    return (
                      <motion.div key={course.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <GlassCard className="h-full p-0 overflow-hidden group flex flex-col" hover>
                          <Link to={`/courses/${course.slug}`} className="block">
                            <div className={`aspect-[16/10] bg-gradient-to-br ${grad} relative overflow-hidden`}>
                              {course.thumbnail ? (
                                <img src={optimizeImageUrl(course.thumbnail, 400, 220)} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-white/50" /></div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute top-2 left-2">
                                <Badge variant={diff.variant} size="sm" className="backdrop-blur bg-white/90 dark:bg-gray-900/80 border-0">{diff.label}</Badge>
                              </div>
                              <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
                                {isFree ? (
                                  <Badge variant="success" size="sm" className="bg-emerald-500 text-white border-0">Free</Badge>
                                ) : discountPercent > 0 ? (
                                  <Badge variant="danger" size="sm" className="shadow-lg">-{discountPercent}% off</Badge>
                                ) : (
                                  <Badge variant="success" size="sm" className="bg-emerald-500 text-white border-0 shadow-lg">Free trial</Badge>
                                )}
                                {!isFree && <Badge variant="warning" size="sm" className="shadow-lg">7-day trial</Badge>}
                              </div>
                              <div className="absolute bottom-2 left-2 right-2">
                                <h3 className="font-semibold text-white line-clamp-1 text-sm drop-shadow">{course.title}</h3>
                                <p className="text-white/80 text-xs truncate">{course.instructor_name || course.category}</p>
                              </div>
                            </div>
                          </Link>
                          <div className="p-4 flex flex-col flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 flex-1">{course.description}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                              <Badge variant="default" size="sm">{course.category}</Badge>
                              <span className="ml-auto font-semibold">
                                {isFree ? (
                                  <span className="text-emerald-600">Free</span>
                                ) : discountPercent > 0 ? (
                                  <span className="flex items-center gap-1.5"><span className="text-gray-400 line-through">{formatCurrency(course.price)}</span><span className="text-emerald-600">{formatCurrency(discountedPrice)}</span></span>
                                ) : (
                                  formatCurrency(course.price)
                                )}
                              </span>
                            </div>
                            {!isFree && !enrolled && (
                              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 mb-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Enroll now and enjoy 7 days free
                              </div>
                            )}
                            {enrolled ? (
                              <Link to={`/student/courses/${course.slug}`}>
                                <Button size="sm" variant="outline" className="w-full">Go to course</Button>
                              </Link>
                            ) : (
                              <div className="space-y-1.5">
                                {!isFree && (
                                  <Link to={`/courses/${course.slug}?trial=1`} className="block">
                                    <Button size="sm" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600">Start 7-day free trial</Button>
                                  </Link>
                                )}
                                <Link to={`/courses/${course.slug}`} className="block">
                                  <Button size="sm" variant="outline" className="w-full">
                                    {isFree ? 'Enroll free' : `Buy this course — ${formatCurrency(discountedPrice)}`}
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
                {coursesPagination.pages > 1 && (
                  <Pagination
                    page={coursesPagination.page}
                    totalPages={coursesPagination.pages}
                    totalItems={coursesPagination.total}
                    onPageChange={setExplorePage}
                  />
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
