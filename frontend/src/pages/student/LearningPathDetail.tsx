import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitBranch, BookOpen, Clock, Users, ChevronLeft, CheckCircle, PlayCircle, Lock, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function LearningPathDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuthStore();
  const [path, setPath] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
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
    }
    fetchData();
  }, [slug, isAuthenticated]);

  const handleEnroll = async () => {
    if (!isAuthenticated) return;
    try {
      await api.post(`/learning-paths/${slug}/enroll`);
      toast.success('Enrolled in learning path!');
      const enrolledRes = await api.get('/learning-paths/my/enrollments');
      const enrolled = enrolledRes.data.data?.find((e: any) => e.slug === slug);
      setEnrollment(enrolled || null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to enroll');
    }
  };

  if (isLoading) return <PageSkeleton />;
  if (!path) return <div className="text-center py-20 text-gray-500">Learning path not found.</div>;

  const courses = path.courses || [];
  const completedCount = enrollment?.courses?.filter((c: any) => c.completed).length || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Link to="/student/learning-paths" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to Learning Paths
      </Link>

      {/* Header */}
      <GlassCard className="p-6 mb-6 overflow-hidden relative">
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${path.color || 'from-blue-600 to-cyan-600'}`} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{path.title}</h1>
                <Badge className="capitalize">{path.level}</Badge>
              </div>
            </div>
            <p className="text-gray-500 mt-2 max-w-2xl">{path.description}</p>

            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {courses.length} courses</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {Math.floor((path.total_duration || 0) / 60)} hours</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {path.students_count || 0} students</span>
            </div>

            {/* Enrollment progress */}
            {enrollment && (
              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{completedCount}/{courses.length} completed</span>
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

          {!enrollment && (
            <Button variant="primary" onClick={handleEnroll} disabled={!isAuthenticated}>
              <PlayCircle className="w-4 h-4 mr-2" /> Enroll in Path
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Course List */}
      <h2 className="text-lg font-semibold mb-4">Courses in this Path</h2>
      <div className="space-y-3">
        {courses.map((course: any, i: number) => {
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
                    {/* Step indicator */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted ? 'bg-success-500 text-white' :
                        isEnrolled ? 'bg-primary-500/20 text-primary-500' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < courses.length - 1 && <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-700" />}
                    </div>

                    {/* Course info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm group-hover:text-primary-600 transition-colors">{course.title}</h3>
                        {isCompleted && <Badge variant="success" size="sm">Completed</Badge>}
                        {isEnrolled && !isCompleted && <Badge variant="primary" size="sm">{progress}%</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{course.instructor_name} · {course.duration} min · {course.level}</p>

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

        {courses.length === 0 && (
          <div className="text-center py-12 text-gray-500">No courses in this path yet.</div>
        )}
      </div>
    </motion.div>
  );
}