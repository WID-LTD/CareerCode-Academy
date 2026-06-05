import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Users, Star, Play, FileText, CheckCircle, ChevronDown,
  Monitor, Award, ArrowLeft, BookOpen, Code2, Download, User
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { NeonButton } from '@/components/ui/NeonButton';
import { cn } from '@/lib/utils';
import { useCourseStore } from '@/store/courseStore';

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours} hours`;
};

export default function CourseDetails() {
  const { slug } = useParams();
  const [expandedModule, setExpandedModule] = useState<number | null>(0);
  
  const { currentCourse: course, isLoading, error, fetchCourseBySlug, enrollCourse } = useCourseStore();
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchCourseBySlug(slug);
    }
  }, [slug]);

  const handleEnroll = async () => {
    if (!course) return;
    setIsEnrolling(true);
    try {
      await enrollCourse(course.id);
      // Success logic here (e.g. redirect to payment or dashboard)
      alert('Enrollment successful or added to cart!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to enroll');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{error || 'Course Not Found'}</h2>
          <Link to="/courses"><Button>Back to Courses</Button></Link>
        </div>
      </div>
    );
  }

  const defaultImage = 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&h=600&fit=crop';
  const defaultAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
        <img src={course.thumbnail || defaultImage} alt={course.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Courses
              </Link>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="primary" size="md" className="capitalize">{course.level}</Badge>
                <Badge variant="default" size="md">{course.category}</Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{course.title}</h1>
              <p className="text-lg text-gray-300 leading-relaxed">{course.description}</p>
            </motion.div>

            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold mb-6">Course Curriculum</h2>
              <div className="space-y-3">
                {course.lessons && course.lessons.length > 0 ? (
                  course.lessons.map((lesson, i) => (
                    <div key={lesson.id} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                      <div className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                            <Play className="w-4 h-4 text-primary-500" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-medium text-sm">{lesson.title}</h3>
                            <p className="text-xs text-gray-500">{formatDuration(lesson.duration)}</p>
                          </div>
                        </div>
                        {lesson.is_free && (
                          <Badge variant="primary" size="sm">Free Preview</Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No curriculum available yet.</p>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold gradient-text">
                    {course.price > 0 ? `$${course.price}` : 'Free'}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <NeonButton 
                  color="blue" 
                  className="w-full"
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                >
                  {isEnrolling ? 'Processing...' : 'Enroll Now'}
                </NeonButton>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-500"><Clock className="w-4 h-4" /> Duration</div>
                  <span className="font-medium">{formatDuration(course.duration)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-500"><Users className="w-4 h-4" /> Students</div>
                  <span className="font-medium">{course.enrollmentCount || 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-500"><Star className="w-4 h-4" /> Rating</div>
                  <span className="font-medium">{course.averageRating ? Number(course.averageRating).toFixed(1) : '0.0'}/5.0</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-gray-500"><Award className="w-4 h-4" /> Certificate</div>
                  <span className="font-medium text-green-500">Yes</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  {course.instructor_avatar ? (
                    <img src={course.instructor_avatar} alt={course.instructor_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-sm">{course.instructor_name || 'Instructor'}</div>
                    <div className="text-xs text-gray-500">Course Instructor</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
