import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/axios';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { BookOpen, ArrowRight, Clock, PlayCircle } from 'lucide-react';
import { optimizeImageUrl } from '@/lib/cloudinary';
import { PageSkeleton, CardSkeleton } from '@/components/student/SkeletonLoader';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  active: 'bg-success-500/20 text-success-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-danger-500/20 text-danger-400',
  pending: 'bg-warning-500/20 text-warning-400',
};

const categoryGradients: Record<string, string> = {
  'Computer Science': 'from-blue-600 to-purple-600',
  'Web Development': 'from-emerald-600 to-teal-600',
  'Data Science': 'from-orange-600 to-pink-600',
  'Cybersecurity': 'from-danger-600 to-rose-600',
  'Cloud Computing': 'from-sky-600 to-indigo-600',
};

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unenrollingIds, setUnenrollingIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const handleUnenroll = async (e: React.MouseEvent, courseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to un-enroll from this course? This will delete all your progress.')) {
      return;
    }
    setUnenrollingIds((prev) => [...prev, courseId]);
    try {
      await api.delete(`/courses/${courseId}/enroll`);
      setEnrollments((prev) =>
        prev.filter((item) => {
          const cId = item.course_id || item.course?.id || item.id;
          return cId !== courseId;
        })
      );
      toast.success('Successfully un-enrolled from course');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to un-enroll from course');
    } finally {
      setUnenrollingIds((prev) => prev.filter((id) => id !== courseId));
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [page, pageSize]);

  const fetchEnrollments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/enrollments?page=${page}&limit=${pageSize}`);
      setEnrollments(data.data || []);
      if (data.pagination) {
        setTotalItems(data.pagination.total);
        setTotalPages(data.pagination.pages);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Courses</h1>
          <p className="text-gray-500 mt-1">
            {enrollments.length > 0
              ? `You are enrolled in ${enrollments.length} course${enrollments.length > 1 ? 's' : ''}.`
              : 'Start learning today!'}
          </p>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <GlassCard className="text-center py-16" hover={false}>
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">You are not enrolled in any courses yet</h2>
          <p className="text-gray-500 mb-6">Browse our catalog and start your learning journey.</p>
          <Link to="/courses">
            <Button icon={<ArrowRight className="w-4 h-4" />}>Browse Courses</Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((item: any, i: number) => {
            const enrollment = item.enrollment || item;
            const course = item.course || {
              ...item,
              title: item.title || item.course_title,
              slug: item.slug || item.course_slug,
              thumbnail: item.thumbnail || item.course_thumbnail,
            };
            const progress = enrollment.progress || 0;
            const status = enrollment.status || 'active';
            const totalLessons = Number(course.total_lessons ?? course.totalLessons ?? 0);
            const completedLessons = Array.isArray(enrollment.completed_lessons) ? enrollment.completed_lessons.length : 0;

            return (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/student/courses/${course.slug}`} className="block group">
                  <GlassCard className="h-full p-0 overflow-hidden" hover>
                    <div className={`aspect-video bg-gradient-to-br ${categoryGradients[course.category] || 'from-primary-600 to-secondary-600'} flex items-center justify-center relative overflow-hidden`}>
                      {course.thumbnail ? (
                        <img src={optimizeImageUrl(course.thumbnail, 480, 270)} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <BookOpen className="w-10 h-10 text-white/50" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">{course.title}</h3>
                      <p className="text-gray-500 text-sm mb-3">{course.instructor_name || course.category}</p>
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={statusColors[status] || 'bg-gray-500/20 text-gray-400'}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {completedLessons}/{totalLessons} lessons
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <Button
                          variant="danger"
                          size="sm"
                          loading={unenrollingIds.includes(item.course_id)}
                          onClick={(e) => handleUnenroll(e, item.course_id)}
                        >
                          Un-enroll
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </motion.div>
  );
}
