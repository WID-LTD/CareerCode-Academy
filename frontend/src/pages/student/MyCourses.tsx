import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { motion } from 'framer-motion';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { BookOpen, ArrowRight, Clock, ChevronRight, PlayCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-red-500/20 text-red-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
};

const categoryGradients: Record<string, string> = {
  'Computer Science': 'from-blue-600 to-purple-600',
  'Web Development': 'from-emerald-600 to-teal-600',
  'Data Science': 'from-orange-600 to-pink-600',
  'Cybersecurity': 'from-red-600 to-rose-600',
  'Cloud Computing': 'from-sky-600 to-indigo-600',
};

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/enrollments');
      setEnrollments(data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="text-center p-8">
          <p className="text-red-400 mb-4">{error}</p>
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
        <GlassCard className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">You are not enrolled in any courses yet</h2>
          <p className="text-gray-500 mb-6">Browse our catalog and start your learning journey.</p>
          <Link to="/courses">
            <Button>
              Browse Courses <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((item: any, i: number) => {
            const enrollment = item.enrollment || item;
            const course = item.course || item;
            const progress = enrollment.progress || 0;
            const status = enrollment.status || 'active';
            const totalLessons = course.totalLessons || 0;
            const completedLessons = enrollment.completed_lessons?.length || 0;

            return (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/student/courses/${course.slug}`}>
                  <GlassCard className="h-full hover:border-blue-500/30 transition-all group">
                    {/* Thumbnail */}
                    <div className={`aspect-video rounded-lg bg-gradient-to-br ${categoryGradients[course.category] || 'from-blue-600 to-purple-600'} flex items-center justify-center relative overflow-hidden mb-4`}>
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-10 h-10 text-white/50" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* Info */}
                    <h3 className="text-white font-semibold mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-gray-500 text-sm mb-3">{course.instructor_name || course.category}</p>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white font-medium">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <Badge className={statusColors[status] || 'bg-gray-500/20 text-gray-400'}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {completedLessons}/{totalLessons} lessons
                      </span>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
