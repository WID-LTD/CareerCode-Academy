import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Play, Star, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useStudentStore } from '@/store/studentStore';

export default function MyCourses() {
  const { enrollments, isLoading, fetchEnrollments } = useStudentStore();
  const totalLessons = 0; // placeholder — will be fetched when course detail is loaded

  useEffect(() => {
    fetchEnrollments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Courses</h1>
          <p className="text-gray-500">You are enrolled in {enrollments.length} course{enrollments.length !== 1 ? 's' : ''}.</p>
        </div>
        <Link to="/courses"><Button variant="outline" icon={<BookOpen className="w-4 h-4" />}>Browse Courses</Button></Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {enrollments.map((enrollment, i) => (
          <motion.div
            key={enrollment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard hover className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1">{enrollment.course_title}</h3>
                  <p className="text-sm text-gray-500">{enrollment.instructor_name}</p>
                </div>
                <Badge variant="primary" size="sm">{enrollment.progress}%</Badge>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Progress</span>
                  <span>{enrollment.completed_lessons?.length || 0} lessons completed</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full gradient-bg rounded-full transition-all duration-500" style={{ width: `${enrollment.progress}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500" /> {enrollment.category}</div>
                <div className="text-gray-400">Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}</div>
              </div>

              <Link to={`/student/courses/${enrollment.course_slug}`}>
                <Button className="w-full" icon={<Play className="w-4 h-4" />}>
                  {enrollment.progress > 0 ? 'Continue Learning' : 'Start Course'}
                </Button>
              </Link>
            </GlassCard>
          </motion.div>
        ))}
        {enrollments.length === 0 && (
          <div className="col-span-2 text-center py-16">
            <p className="text-gray-500 mb-4">You are not enrolled in any courses yet.</p>
            <Link to="/courses"><Button>Browse Courses</Button></Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
