import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Clock,
  Users,
  Star,
  Code2,
  Database,
  Globe,
  Smartphone,
  Shield,
  Palette,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useCourseStore } from '@/store/courseStore';

const categories = ['All', 'Web Development', 'Data Science', 'Mobile', 'DevOps', 'Security', 'Design', 'AI'];
const levels = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

// Helper to map category to icon and color
const getCategoryStyles = (category: string) => {
  switch (category.toLowerCase()) {
    case 'web development':
      return { icon: Code2, color: 'from-blue-500 to-cyan-500' };
    case 'data science':
      return { icon: Database, color: 'from-purple-500 to-pink-500' };
    case 'mobile':
      return { icon: Smartphone, color: 'from-green-500 to-emerald-500' };
    case 'devops':
      return { icon: Globe, color: 'from-orange-500 to-red-500' };
    case 'security':
      return { icon: Shield, color: 'from-red-500 to-rose-500' };
    case 'design':
      return { icon: Palette, color: 'from-pink-500 to-rose-500' };
    case 'ai':
      return { icon: TrendingUp, color: 'from-violet-500 to-purple-500' };
    default:
      return { icon: BookOpen, color: 'from-gray-500 to-slate-500' };
  }
};

// Helper to format duration in minutes to readable format
const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours} hours`;
};

export default function Courses() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All Levels');
  
  const { courses, isLoading, fetchCourses } = useCourseStore();

  useEffect(() => {
    fetchCourses({ category, level });
  }, [category, level]);

  const filtered = courses.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Explore Our <span className="gradient-text">Courses</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose from industry-designed courses and start your journey toward becoming a job-ready developer.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                {levels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((course, i) => {
                  const style = getCategoryStyles(course.category);
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link to={`/courses/${course.slug}`}>
                        <GlassCard hover className="h-full p-6 group">
                          {course.thumbnail ? (
                            <div className="w-full h-32 rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
                              <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center mb-4`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="mb-3 flex gap-2">
                            <Badge variant="primary" size="sm" className="capitalize">{course.level}</Badge>
                            <Badge variant="default" size="sm">{course.category}</Badge>
                          </div>
                          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary-500 transition-colors line-clamp-2">{course.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{course.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
                            <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(course.duration)}</div>
                            <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{/* Missing enrollmentCount on list, mock or 0 */}0</div>
                            <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500" />{/* Missing rating on list */}0.0</div>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-500 text-lg">No courses found matching your criteria.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </motion.div>
  );
}
