import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { GitBranch, BookOpen, ArrowRight, Clock, Award, Users, CheckCircle, PlayCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function LearningPaths() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [enrolledPaths, setEnrolledPaths] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pathsRes, enrolledRes] = await Promise.all([
          api.get('/learning-paths'),
          isAuthenticated ? api.get('/learning-paths/my/enrollments').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        ]);
        setLearningPaths(pathsRes.data.data || []);
        setEnrolledPaths(enrolledRes.data.data || []);
      } catch {
        setLearningPaths([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated]);

  const handleEnroll = async (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/learning-paths/${slug}/enroll`);
      toast.success('Enrolled in learning path!');
      const enrolledRes = await api.get('/learning-paths/my/enrollments');
      setEnrolledPaths(enrolledRes.data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to enroll');
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  // Merge enrolled paths into the display list
  const enrolledMap = new Map(enrolledPaths.map((ep: any) => [ep.path_id, ep]));
  const mergedPaths = learningPaths.map((lp: any) => {
    const enrolled = enrolledMap.get(lp.id);
    return enrolled ? { ...lp, enrolled: true, progress: enrolled.progress, completedCourses: enrolled.completedCourses, totalCourses: enrolled.totalCourses } : lp;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Learning Paths</h1>
        <p className="text-gray-500 mt-1">Follow structured paths to master new skills.</p>
      </div>

      {/* My Enrolled Paths */}
      {enrolledPaths.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-500" />
            My Learning Paths
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledPaths.map((path: any, i: number) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/student/learning-paths/${path.slug}`} className="block group">
                  <GlassCard className="h-full p-0 overflow-hidden" hover>
                    <div className={`h-2 bg-gradient-to-r ${path.color || 'from-blue-600 to-cyan-600'}`} />
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                          <GitBranch className="w-5 h-5 text-primary-500" />
                        </div>
                        <Badge variant={path.progress >= 100 ? 'success' : 'primary'} size="sm">
                          {path.progress}%
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-base mb-1 group-hover:text-primary-600 transition-colors">{path.title}</h3>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{path.description}</p>

                      {/* Progress bar */}
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                          style={{ width: `${path.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-success-500" /> {path.completedCourses || 0}/{path.totalCourses || 0}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {path.enrolledCourses || 0} enrolled</span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* All Learning Paths */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Explore Paths</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mergedPaths.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-500">
              No learning paths available yet.
            </div>
          )}
          {mergedPaths.filter((lp: any) => !lp.enrolled).map((path: any, i: number) => (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/student/learning-paths/${path.slug}`} className="block group">
                <GlassCard className="h-full p-0 overflow-hidden" hover>
                  <div className={`h-2 bg-gradient-to-r ${path.color || 'from-blue-600 to-cyan-600'}`} />
                  <div className="p-5">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3">
                      <GitBranch className="w-5 h-5 text-primary-500" />
                    </div>
                    <h3 className="font-semibold text-base mb-1 group-hover:text-primary-600 transition-colors">{path.title}</h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{path.description}</p>

                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {path.courses_count} courses</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor((path.total_duration || 0) / 60)}h</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {path.students_count || 0}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={(e) => handleEnroll(path.slug, e)}>
                        <PlayCircle className="w-3.5 h-3.5 mr-1" /> Enroll
                      </Button>
                      <Badge className="capitalize">{path.level}</Badge>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}