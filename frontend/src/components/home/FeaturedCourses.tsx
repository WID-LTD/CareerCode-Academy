import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, Star, ArrowRight, Code2, Database, Globe, Smartphone, BookOpen } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useCourseStore } from '@/store/courseStore';
import { optimizeImageUrl } from '@/lib/cloudinary';

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  'Programming': { icon: Code2, color: 'from-blue-500 to-cyan-500' },
  'Data Science': { icon: Database, color: 'from-purple-500 to-pink-500' },
  'Mobile': { icon: Smartphone, color: 'from-green-500 to-emerald-500' },
  'Cloud Computing': { icon: Globe, color: 'from-orange-500 to-red-500' },
  'Web Development': { icon: Code2, color: 'from-blue-500 to-cyan-500' },
  'Computer Science': { icon: BookOpen, color: 'from-violet-500 to-indigo-500' },
  'Networking': { icon: Globe, color: 'from-teal-500 to-cyan-500' },
  'Security': { icon: BookOpen, color: 'from-red-500 to-rose-500' },
  'AI': { icon: Database, color: 'from-purple-500 to-pink-500' },
  'DevOps': { icon: Globe, color: 'from-orange-500 to-red-500' },
  'Design': { icon: BookOpen, color: 'from-pink-500 to-rose-500' },
  'Databases': { icon: Database, color: 'from-teal-500 to-cyan-500' },
  'Software Engineering': { icon: Code2, color: 'from-blue-500 to-cyan-500' },
};

export function FeaturedCourses() {
  const { courses, fetchCourses } = useCourseStore();

  useEffect(() => {
    fetchCourses({ category: undefined, level: undefined });
  }, []);

  const featured = courses.slice(0, 4);
  return (
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="gradient-text">Featured Courses</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Industry-aligned curriculum designed to take you from beginner to job-ready developer.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((course, index) => {
            const cfg = categoryConfig[course.category] || { icon: BookOpen, color: 'from-blue-500 to-cyan-500' };
            const Icon = cfg.icon;
            const thumb = course.thumbnail ? optimizeImageUrl(course.thumbnail, 400, 250) : null;
            return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/courses/${course.slug}`}>
                <GlassCard hover className="h-full p-0 group cursor-pointer overflow-hidden">
                  {thumb && (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={thumb}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center mb-4 -mt-10 border-4 border-white dark:border-gray-900 shadow-lg`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="mb-3">
                      <Badge variant="primary" size="sm">
                        {course.level}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {course.duration}h
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {course.enrollmentCount || course.student_count || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500" />
                        {course.averageRating || course.avg_rating || '-'}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold hover:gap-3 transition-all"
          >
            View All Courses
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
